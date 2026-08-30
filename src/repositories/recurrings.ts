import { addDays } from 'date-fns';
import { and, asc, eq, lte, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  categories,
  recurrings,
  savingsGoals,
  transactions,
  type EntryType,
  type RecurrenceKind,
  type Recurring,
} from '@/db/schema';
import { advanceAfter, nextOccurrenceOnOrAfter } from '@/domain/recurring';
import { toIso, today, type IsoDate } from '@/domain/period';

export interface RecurringRow extends Recurring {
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  goalName: string | null;
  goalIcon: string | null;
  goalColor: string | null;
}

const rowSelection = {
  id: recurrings.id,
  name: recurrings.name,
  type: recurrings.type,
  amount: recurrings.amount,
  categoryId: recurrings.categoryId,
  savingsGoalId: recurrings.savingsGoalId,
  memo: recurrings.memo,
  kind: recurrings.kind,
  day: recurrings.day,
  month: recurrings.month,
  startsOn: recurrings.startsOn,
  endsOn: recurrings.endsOn,
  nextDueOn: recurrings.nextDueOn,
  autoPost: recurrings.autoPost,
  notifyDaysBefore: recurrings.notifyDaysBefore,
  isActive: recurrings.isActive,
  createdAt: recurrings.createdAt,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  categoryColor: categories.color,
  goalName: savingsGoals.name,
  goalIcon: savingsGoals.icon,
  goalColor: savingsGoals.color,
};

export async function list(): Promise<RecurringRow[]> {
  return db
    .select(rowSelection)
    .from(recurrings)
    .leftJoin(categories, eq(recurrings.categoryId, categories.id))
    .leftJoin(savingsGoals, eq(recurrings.savingsGoalId, savingsGoals.id))
    .orderBy(asc(recurrings.isActive), asc(recurrings.nextDueOn));
}

export async function listActive(): Promise<RecurringRow[]> {
  return db
    .select(rowSelection)
    .from(recurrings)
    .leftJoin(categories, eq(recurrings.categoryId, categories.id))
    .leftJoin(savingsGoals, eq(recurrings.savingsGoalId, savingsGoals.id))
    .where(eq(recurrings.isActive, true))
    .orderBy(asc(recurrings.nextDueOn));
}

export async function getById(id: number): Promise<RecurringRow | null> {
  const [row] = await db
    .select(rowSelection)
    .from(recurrings)
    .leftJoin(categories, eq(recurrings.categoryId, categories.id))
    .leftJoin(savingsGoals, eq(recurrings.savingsGoalId, savingsGoals.id))
    .where(eq(recurrings.id, id))
    .limit(1);
  return row ?? null;
}

/** ホーム画面の「まもなく引き落とし」表示用 */
export async function upcoming(withinDays = 14): Promise<RecurringRow[]> {
  const limit = toIso(addDays(new Date(), withinDays));
  return db
    .select(rowSelection)
    .from(recurrings)
    .leftJoin(categories, eq(recurrings.categoryId, categories.id))
    .leftJoin(savingsGoals, eq(recurrings.savingsGoalId, savingsGoals.id))
    .where(and(eq(recurrings.isActive, true), lte(recurrings.nextDueOn, limit)))
    .orderBy(asc(recurrings.nextDueOn));
}

/**
 * 手動確定モード（autoPost = false）で期日を過ぎているもの。
 * ホーム画面に「確認待ち」として出し、ユーザーが承認するまで計上しない。
 */
export async function listPendingConfirmations(
  asOf: IsoDate = today(),
): Promise<RecurringRow[]> {
  return db
    .select(rowSelection)
    .from(recurrings)
    .leftJoin(categories, eq(recurrings.categoryId, categories.id))
    .leftJoin(savingsGoals, eq(recurrings.savingsGoalId, savingsGoals.id))
    .where(
      and(
        eq(recurrings.isActive, true),
        eq(recurrings.autoPost, false),
        lte(recurrings.nextDueOn, asOf),
      ),
    )
    .orderBy(asc(recurrings.nextDueOn));
}

/** 入力欄側で maxLength を掛けられないぶん、保存時に丸める（→ TextField の説明を参照） */
export const NAME_MAX = 40;
export const MEMO_MAX = 200;

function normalizeName(name: string): string {
  return name.trim().slice(0, NAME_MAX);
}

function normalizeMemo(memo: string | null | undefined): string | null {
  return memo?.trim().slice(0, MEMO_MAX) || null;
}

export interface RecurringInput {
  name: string;
  type: EntryType;
  amount: number;
  categoryId: number | null;
  /** type = 'savings' のときの積立先 */
  savingsGoalId?: number | null;
  memo?: string | null;
  kind: RecurrenceKind;
  day: number;
  month?: number | null;
  startsOn: IsoDate;
  endsOn?: IsoDate | null;
  autoPost: boolean;
  notifyDaysBefore?: number | null;
}

function ruleOf(input: RecurringInput) {
  return {
    kind: input.kind,
    day: input.day,
    month: input.month ?? null,
    startsOn: input.startsOn,
    endsOn: input.endsOn ?? null,
  };
}

export async function create(input: RecurringInput): Promise<number> {
  const nextDueOn =
    nextOccurrenceOnOrAfter(ruleOf(input), input.startsOn) ?? input.startsOn;

  const [row] = await db
    .insert(recurrings)
    .values({
      ...input,
      name: normalizeName(input.name),
      memo: normalizeMemo(input.memo),
      savingsGoalId: input.savingsGoalId ?? null,
      month: input.month ?? null,
      endsOn: input.endsOn ?? null,
      notifyDaysBefore: input.notifyDaysBefore ?? null,
      nextDueOn,
    })
    .returning({ id: recurrings.id });
  return row.id;
}

export async function update(id: number, input: RecurringInput): Promise<void> {
  // 規則を変えたら次回発生日を計算し直す。生成済みの取引には遡って触れない。
  const now = today();
  const anchor = now < input.startsOn ? input.startsOn : now;
  const nextDueOn =
    nextOccurrenceOnOrAfter(ruleOf(input), anchor) ?? input.startsOn;

  await db
    .update(recurrings)
    .set({
      ...input,
      name: normalizeName(input.name),
      memo: normalizeMemo(input.memo),
      savingsGoalId: input.savingsGoalId ?? null,
      month: input.month ?? null,
      endsOn: input.endsOn ?? null,
      notifyDaysBefore: input.notifyDaysBefore ?? null,
      nextDueOn,
    })
    .where(eq(recurrings.id, id));
}

export async function setActive(id: number, active: boolean): Promise<void> {
  await db
    .update(recurrings)
    .set({ isActive: active })
    .where(eq(recurrings.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(recurrings).where(eq(recurrings.id, id));
}

/* ------------------------------------------------------------------ */
/* 発生処理                                                             */
/* ------------------------------------------------------------------ */

export interface PendingOccurrence {
  recurringId: number;
  name: string;
  type: EntryType;
  amount: number;
  categoryId: number | null;
  savingsGoalId: number | null;
  memo: string | null;
  occurredOn: IsoDate;
}

/** 一度の処理で進める上限。長期間アプリを開かなかった場合の暴走を防ぐ */
const MAX_STEPS_PER_RULE = 400;

/**
 * 期日を過ぎた固定費を処理する。起動時に一度だけ呼ぶ。
 *
 *   autoPost = true  … 取引を生成し、次回発生日を前進させる
 *   autoPost = false … 生成せず「確認待ち」として返す（確定するまで前進しない）
 *
 * 重複生成の防止はユニーク索引 (recurring_id, occurred_on) に任せているので、
 * 二重に呼ばれても取引が増えることはない。
 */
export async function postDue(
  asOf: IsoDate = today(),
): Promise<{ posted: number; pending: PendingOccurrence[] }> {
  const due = await db
    .select()
    .from(recurrings)
    .where(and(eq(recurrings.isActive, true), lte(recurrings.nextDueOn, asOf)));

  let posted = 0;
  const pending: PendingOccurrence[] = [];

  for (const rule of due) {
    if (!rule.autoPost) {
      pending.push({
        recurringId: rule.id,
        name: rule.name,
        type: rule.type,
        amount: rule.amount,
        categoryId: rule.categoryId,
        savingsGoalId: rule.savingsGoalId,
        memo: rule.memo,
        occurredOn: rule.nextDueOn,
      });
      continue;
    }

    let cursor: IsoDate | null = rule.nextDueOn;
    let steps = 0;

    await db.transaction(async (tx) => {
      while (cursor && cursor <= asOf && steps < MAX_STEPS_PER_RULE) {
        await tx
          .insert(transactions)
          .values({
            type: rule.type,
            amount: rule.amount,
            occurredOn: cursor,
            categoryId: rule.categoryId,
            savingsGoalId: rule.savingsGoalId,
            memo: rule.memo ?? rule.name,
            recurringId: rule.id,
          })
          .onConflictDoNothing();
        posted += 1;
        steps += 1;
        cursor = advanceAfter(rule, cursor);
      }

      if (cursor) {
        await tx
          .update(recurrings)
          .set({ nextDueOn: cursor })
          .where(eq(recurrings.id, rule.id));
      } else {
        // 終了日に到達したので自動的に無効化する
        await tx
          .update(recurrings)
          .set({ isActive: false })
          .where(eq(recurrings.id, rule.id));
      }
    });
  }

  return { posted, pending };
}

/** 手動確定モードの固定費を、ユーザーの承認を受けて1回分だけ計上する */
export async function confirmOccurrence(
  recurringId: number,
  occurredOn: IsoDate,
): Promise<void> {
  const [rule] = await db
    .select()
    .from(recurrings)
    .where(eq(recurrings.id, recurringId))
    .limit(1);
  if (!rule) return;

  await db.transaction(async (tx) => {
    await tx
      .insert(transactions)
      .values({
        type: rule.type,
        amount: rule.amount,
        occurredOn,
        categoryId: rule.categoryId,
        savingsGoalId: rule.savingsGoalId,
        memo: rule.memo ?? rule.name,
        recurringId: rule.id,
      })
      .onConflictDoNothing();

    const next = advanceAfter(rule, occurredOn);
    await tx
      .update(recurrings)
      .set(next ? { nextDueOn: next } : { isActive: false })
      .where(eq(recurrings.id, rule.id));
  });
}

/** 承認せず今回分を飛ばす */
export async function skipOccurrence(recurringId: number): Promise<void> {
  const [rule] = await db
    .select()
    .from(recurrings)
    .where(eq(recurrings.id, recurringId))
    .limit(1);
  if (!rule) return;
  const next = advanceAfter(rule, rule.nextDueOn);
  await db
    .update(recurrings)
    .set(next ? { nextDueOn: next } : { isActive: false })
    .where(eq(recurrings.id, rule.id));
}

/** 固定費だけの月あたり概算。予算を立てるときの下限の目安として出す */
export async function monthlyFixedTotal(type: EntryType): Promise<number> {
  const rows = await db
    .select({ kind: recurrings.kind, amount: recurrings.amount })
    .from(recurrings)
    .where(and(eq(recurrings.isActive, true), eq(recurrings.type, type)));

  return rows.reduce((sum, r) => {
    if (r.kind === 'monthly') return sum + r.amount;
    if (r.kind === 'yearly') return sum + Math.round(r.amount / 12);
    // weekly は 1年52週として月割りする
    return sum + Math.round((r.amount * 52) / 12);
  }, 0);
}

export async function countActive(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(recurrings)
    .where(eq(recurrings.isActive, true));
  return row?.count ?? 0;
}
