import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { db, sqliteDb } from '@/db/client';
import {
  budgets,
  categories,
  recurrings,
  savingsGoals,
  settings,
  transactions,
} from '@/db/schema';
import { formatYearMonth, today, yearMonthOf } from '@/domain/period';
import { KEYS, set as setSetting } from './settings';

/**
 * サーバーを持たない構成なので、機種変更時のデータ移行はこのファイル任せになる。
 * ここが壊れるとユーザーは全履歴を失うため、
 *  - 形式は人間が読める JSON（壊れても手で救出できる）
 *  - バージョン番号を必ず持たせる（将来のスキーマ変更に耐える）
 *  - 復元は必ずトランザクションで全置換（半端な状態を残さない）
 * の3点を守る。
 */

const BACKUP_VERSION = 1;

interface BackupPayload {
  format: 'kakeibo-backup';
  version: number;
  exportedAt: string;
  counts: Record<string, number>;
  data: {
    categories: unknown[];
    savingsGoals: unknown[];
    transactions: unknown[];
    budgets: unknown[];
    recurrings: unknown[];
    settings: unknown[];
  };
}

async function collect(): Promise<BackupPayload> {
  const [cats, goals, txns, buds, recs, sets] = await Promise.all([
    db.select().from(categories),
    db.select().from(savingsGoals),
    db.select().from(transactions),
    db.select().from(budgets),
    db.select().from(recurrings),
    db.select().from(settings),
  ]);

  return {
    format: 'kakeibo-backup',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    counts: {
      categories: cats.length,
      savingsGoals: goals.length,
      transactions: txns.length,
      budgets: buds.length,
      recurrings: recs.length,
    },
    data: {
      categories: cats,
      savingsGoals: goals,
      transactions: txns,
      budgets: buds,
      recurrings: recs,
      settings: sets,
    },
  };
}

function writeTempFile(name: string, contents: string): File {
  const file = new File(Paths.cache, name);
  if (file.exists) file.delete();
  file.create({ overwrite: true, intermediates: true });
  file.write(contents);
  return file;
}

/**
 * JSON バックアップを書き出して共有シートを開く。
 * ここから iCloud Drive / Google Drive / メール等、ユーザーが選んだ先へ保存できる。
 */
export async function exportJson(): Promise<{ uri: string; count: number }> {
  const payload = await collect();
  const file = writeTempFile(
    `kakeibo-backup-${today()}.json`,
    JSON.stringify(payload, null, 2),
  );

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: '家計簿のバックアップを保存',
      UTI: 'public.json',
    });
  }

  await setSetting(KEYS.lastBackupAt, new Date().toISOString());
  return { uri: file.uri, count: payload.counts.transactions };
}

/** Excel / Numbers で開ける CSV。表計算で分析したい人向けの出口 */
export async function exportCsv(): Promise<{ uri: string; count: number }> {
  const rows = await db
    .select({
      occurredOn: transactions.occurredOn,
      type: transactions.type,
      amount: transactions.amount,
      category: categories.name,
      memo: transactions.memo,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .orderBy(transactions.occurredOn);

  const escape = (value: unknown): string => {
    const s = value === null || value === undefined ? '' : String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const header = '日付,種別,金額,カテゴリ,メモ';
  const body = rows
    .map((r) =>
      [
        r.occurredOn,
        r.type === 'income' ? '収入' : r.type === 'savings' ? '貯金' : '支出',
        r.amount,
        r.category ?? '未分類',
        r.memo,
      ]
        .map(escape)
        .join(','),
    )
    .join('\n');

  // Excel が UTF-8 と判定できるよう BOM を付ける
  const file = writeTempFile(
    `kakeibo-${today()}.csv`,
    `﻿${header}\n${body}\n`,
  );

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(file.uri, {
      mimeType: 'text/csv',
      dialogTitle: '家計簿を CSV で書き出す',
      UTI: 'public.comma-separated-values-text',
    });
  }
  return { uri: file.uri, count: rows.length };
}

export interface ImportResult {
  status: 'imported' | 'canceled';
  counts?: Record<string, number>;
}

/**
 * 復元は他アプリ由来のファイルを掴まされる可能性がある唯一の入口なので、
 * 形だけは厳密に検証してから DB を触る。
 * 個々の行の中身までは検証せず、insert 時の型・制約に任せる。
 */
const payloadSchema = z.object({
  format: z.literal('kakeibo-backup'),
  version: z.number().int().max(BACKUP_VERSION),
  exportedAt: z.string(),
  counts: z.record(z.string(), z.number()).default({}),
  data: z.object({
    categories: z.array(z.unknown()).default([]),
    savingsGoals: z.array(z.unknown()).default([]),
    transactions: z.array(z.unknown()).default([]),
    budgets: z.array(z.unknown()).default([]),
    recurrings: z.array(z.unknown()).default([]),
    settings: z.array(z.unknown()).default([]),
  }),
});

function parsePayload(raw: unknown): BackupPayload {
  const result = payloadSchema.safeParse(raw);
  if (result.success) return result.data as BackupPayload;

  const issue = result.error.issues[0];
  if (issue?.path.join('.') === 'format') {
    throw new Error('このアプリのバックアップファイルではありません。');
  }
  if (issue?.path.join('.') === 'version') {
    throw new Error(
      'より新しいバージョンのバックアップです。アプリを更新してください。',
    );
  }
  throw new Error('バックアップファイルの形式が正しくありません。');
}

/**
 * 復元は「全消し → 流し込み」。マージは競合解決が必要になり、
 * 単独端末前提のこのアプリでは複雑さに見合わないため採らない。
 * 呼び出し側で必ず確認ダイアログを出すこと。
 */
export async function importJson(): Promise<ImportResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: ['application/json', 'public.json', '*/*'],
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets?.[0]) return { status: 'canceled' };

  const file = new File(picked.assets[0].uri);
  const parsed = parsePayload(JSON.parse(await file.text()));
  const { data } = parsed;

  await db.transaction(async (tx) => {
    // 外部キーの依存順に消す
    await tx.delete(transactions);
    await tx.delete(budgets);
    await tx.delete(recurrings);
    await tx.delete(savingsGoals);
    await tx.delete(categories);
    await tx.delete(settings);

    if (data.categories?.length)
      await tx.insert(categories).values(data.categories as never);
    if (data.savingsGoals?.length)
      await tx.insert(savingsGoals).values(data.savingsGoals as never);
    if (data.recurrings?.length)
      await tx.insert(recurrings).values(data.recurrings as never);
    if (data.transactions?.length)
      await tx.insert(transactions).values(data.transactions as never);
    if (data.budgets?.length)
      await tx.insert(budgets).values(data.budgets as never);
    if (data.settings?.length)
      await tx.insert(settings).values(data.settings as never);
  });

  return { status: 'imported', counts: parsed.counts };
}

/** 全消去（設定画面から、二重確認のうえで呼ぶ） */
export async function wipeAll(): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(transactions);
    await tx.delete(budgets);
    await tx.delete(recurrings);
    await tx.delete(savingsGoals);
    await tx.delete(categories);
    await tx.delete(settings);
  });
  sqliteDb.execSync('VACUUM;');
}

/** 設定画面に出す「このバックアップには何月分が入っているか」の説明 */
export async function describeRange(): Promise<string | null> {
  const rows = await db
    .select({ occurredOn: transactions.occurredOn })
    .from(transactions)
    .orderBy(transactions.occurredOn)
    .limit(1);
  if (!rows.length) return null;
  return `${formatYearMonth(yearMonthOf(rows[0].occurredOn))}以降`;
}
