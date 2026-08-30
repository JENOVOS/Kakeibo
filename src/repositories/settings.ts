import { eq } from 'drizzle-orm';
import { db } from '@/db/client';
import { settings } from '@/db/schema';

/**
 * アプリ設定は小さな Key-Value なので専用ストレージを増やさず SQLite に置く。
 * バックアップ・復元の対象が DB ひとつで済むという利点がある。
 */

export const KEYS = {
  /** 締め日（1-28）。1 なら暦月どおり */
  monthStartDay: 'month_start_day',
  /** 固定費リマインダーの通知時刻 'HH:mm' */
  notifyAt: 'notify_at',
  lastBackupAt: 'last_backup_at',
  /** 'light' | 'dark' | 'system'。未設定はライト */
  themeMode: 'theme_mode',
  lastPostRunOn: 'last_post_run_on',
  /** 買い切り購入済みフラグ。ストアに繋がらないときの控えとして持つ */
  proUnlocked: 'pro_unlocked',
} as const;

export type SettingKey = (typeof KEYS)[keyof typeof KEYS];

export async function get(key: SettingKey): Promise<string | null> {
  const [row] = await db
    .select({ value: settings.value })
    .from(settings)
    .where(eq(settings.key, key))
    .limit(1);
  return row?.value ?? null;
}

export async function set(key: SettingKey, value: string): Promise<void> {
  await db
    .insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } });
}

export async function getNumber(
  key: SettingKey,
  fallback: number,
): Promise<number> {
  const raw = await get(key);
  if (raw === null) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

export async function remove(key: SettingKey): Promise<void> {
  await db.delete(settings).where(eq(settings.key, key));
}
