import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  savingsGoals,
  transactions,
  type SavingsGoal,
} from '@/db/schema';
import {
  daysUntil,
  outlook,
  progressOf,
  requiredMonthlyPace,
  type GoalProgress,
  type Outlook,
} from '@/domain/savings';
import { yearMonthOf, type IsoDate } from '@/domain/period';

export interface GoalRow extends SavingsGoal, GoalProgress {
  /** 目標日までの残り日数。期限なしなら null */
  daysLeft: number | null;
  /** 目標日に間に合わせるための月あたり必要額 */
  requiredMonthly: number | null;
  outlook: Outlook;
  /** 最初の積立日。未積立なら null */
  startedOn: IsoDate | null;
}

/** 目標ごとの積立合計。残高カラムは持たず、毎回取引から数える */
async function savedByGoal(): Promise<Map<number, { total: number; first: string }>> {
  const rows = await db
    .select({
      goalId: transactions.savingsGoalId,
      total: sql<number>`sum(${transactions.amount})`,
      first: sql<string>`min(${transactions.occurredOn})`,
    })
    .from(transactions)
    .where(eq(transactions.type, 'savings'))
    .groupBy(transactions.savingsGoalId);

  const map = new Map<number, { total: number; first: string }>();
  for (const r of rows) {
    if (r.goalId === null) continue;
    map.set(r.goalId, { total: r.total ?? 0, first: r.first });
  }
  return map;
}

function decorate(
  goal: SavingsGoal,
  saved: number,
  startedOn: IsoDate | null,
): GoalRow {
  const progress = progressOf(saved, goal.targetAmount);
  // 積立を始めてからの経過月数。未積立なら 0
  const monthsElapsed = startedOn
    ? monthsBetween(startedOn)
    : 0;

  return {
    ...goal,
    ...progress,
    startedOn,
    daysLeft: daysUntil(goal.targetDate),
    requiredMonthly: requiredMonthlyPace(progress.remaining, goal.targetDate),
    outlook: outlook(progress, goal.targetDate, monthsElapsed),
  };
}

function monthsBetween(from: IsoDate): number {
  const a = yearMonthOf(from);
  const now = new Date();
  return (
    (now.getFullYear() - a.year) * 12 + (now.getMonth() + 1 - a.month) + 1
  );
}

export async function list(includeArchived = false): Promise<GoalRow[]> {
  const [goals, saved] = await Promise.all([
    db
      .select()
      .from(savingsGoals)
      .where(includeArchived ? undefined : eq(savingsGoals.isArchived, false))
      .orderBy(asc(savingsGoals.sortOrder), asc(savingsGoals.id)),
    savedByGoal(),
  ]);

  return goals.map((g) => {
    const s = saved.get(g.id);
    return decorate(g, s?.total ?? 0, s?.first ?? null);
  });
}

export async function getById(id: number): Promise<GoalRow | null> {
  const [goal] = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.id, id))
    .limit(1);
  if (!goal) return null;
  const s = (await savedByGoal()).get(id);
  return decorate(goal, s?.total ?? 0, s?.first ?? null);
}

/** 入力欄で使う選択肢（アーカイブ済みは除く） */
export async function listForPicker(): Promise<SavingsGoal[]> {
  return db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.isArchived, false))
    .orderBy(asc(savingsGoals.sortOrder), asc(savingsGoals.id));
}

export const NAME_MAX = 30;

export interface GoalInput {
  name: string;
  targetAmount: number;
  targetDate: IsoDate | null;
  memo?: string | null;
  icon: string;
  color: string;
}

export async function create(input: GoalInput): Promise<number> {
  const [max] = await db
    .select({ v: sql<number>`coalesce(max(${savingsGoals.sortOrder}), 0)` })
    .from(savingsGoals);

  const [row] = await db
    .insert(savingsGoals)
    .values({
      ...input,
      name: input.name.trim().slice(0, NAME_MAX),
      memo: input.memo?.trim() || null,
      sortOrder: (max?.v ?? 0) + 10,
    })
    .returning({ id: savingsGoals.id });
  return row.id;
}

export async function update(id: number, input: GoalInput): Promise<void> {
  await db
    .update(savingsGoals)
    .set({
      ...input,
      name: input.name.trim().slice(0, NAME_MAX),
      memo: input.memo?.trim() || null,
    })
    .where(eq(savingsGoals.id, id));
}

export async function setArchived(id: number, archived: boolean): Promise<void> {
  await db
    .update(savingsGoals)
    .set({ isArchived: archived })
    .where(eq(savingsGoals.id, id));
}

/** 積立の記録が1件でもあれば削除させない（履歴が未分類の貯金に化けるため） */
export async function usageCount(id: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(
      and(eq(transactions.type, 'savings'), eq(transactions.savingsGoalId, id)),
    );
  return row?.count ?? 0;
}

export async function remove(id: number): Promise<void> {
  await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
}

export async function countActive(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(savingsGoals)
    .where(eq(savingsGoals.isArchived, false));
  return row?.count ?? 0;
}
