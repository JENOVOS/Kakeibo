import { and, between, desc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  categories,
  savingsGoals,
  transactions,
  type EntryType,
  type NewTransaction,
} from '@/db/schema';
import { summarize as toSummary, type Summary } from '@/domain/summary';
import {
  monthRange,
  today,
  yearRange,
  type IsoDate,
  type YearMonth,
} from '@/domain/period';

export interface TransactionRow {
  id: number;
  type: EntryType;
  amount: number;
  occurredOn: IsoDate;
  memo: string | null;
  recurringId: number | null;
  categoryId: number | null;
  categoryName: string | null;
  categoryIcon: string | null;
  categoryColor: string | null;
  savingsGoalId: number | null;
  goalName: string | null;
  goalIcon: string | null;
  goalColor: string | null;
}

const rowSelection = {
  id: transactions.id,
  type: transactions.type,
  amount: transactions.amount,
  occurredOn: transactions.occurredOn,
  memo: transactions.memo,
  recurringId: transactions.recurringId,
  categoryId: transactions.categoryId,
  categoryName: categories.name,
  categoryIcon: categories.icon,
  categoryColor: categories.color,
  savingsGoalId: transactions.savingsGoalId,
  goalName: savingsGoals.name,
  goalIcon: savingsGoals.icon,
  goalColor: savingsGoals.color,
};

export async function listByMonth(
  ym: YearMonth,
  type?: EntryType,
): Promise<TransactionRow[]> {
  const [from, to] = monthRange(ym);
  return db
    .select(rowSelection)
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(savingsGoals, eq(transactions.savingsGoalId, savingsGoals.id))
    .where(
      type
        ? and(
            between(transactions.occurredOn, from, to),
            eq(transactions.type, type),
          )
        : between(transactions.occurredOn, from, to),
    )
    .orderBy(desc(transactions.occurredOn), desc(transactions.id));
}

export async function getById(id: number): Promise<TransactionRow | null> {
  const [row] = await db
    .select(rowSelection)
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(savingsGoals, eq(transactions.savingsGoalId, savingsGoals.id))
    .where(eq(transactions.id, id))
    .limit(1);
  return row ?? null;
}

export async function listRecent(limit = 5): Promise<TransactionRow[]> {
  return db
    .select(rowSelection)
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(savingsGoals, eq(transactions.savingsGoalId, savingsGoals.id))
    .orderBy(desc(transactions.occurredOn), desc(transactions.id))
    .limit(limit);
}

export type PeriodSummary = Summary;

async function summarizeRange(from: IsoDate, to: IsoDate): Promise<PeriodSummary> {
  const rows = await db
    .select({
      type: transactions.type,
      total: sql<number>`coalesce(sum(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .where(between(transactions.occurredOn, from, to))
    .groupBy(transactions.type);

  // 足し引きの意味は domain/summary に寄せてある（テスト対象）
  return toSummary({
    income: rows.find((r) => r.type === 'income')?.total ?? 0,
    expense: rows.find((r) => r.type === 'expense')?.total ?? 0,
    savings: rows.find((r) => r.type === 'savings')?.total ?? 0,
  });
}

export function summaryOfMonth(ym: YearMonth): Promise<PeriodSummary> {
  const [from, to] = monthRange(ym);
  return summarizeRange(from, to);
}

export function summaryOfYear(year: number): Promise<PeriodSummary> {
  const [from, to] = yearRange(year);
  return summarizeRange(from, to);
}

/** 期間内の積立合計。全体予算の消化に足すために使う */
export async function savingsTotal(
  from: IsoDate,
  to: IsoDate,
): Promise<number> {
  const [row] = await db
    .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
    .from(transactions)
    .where(
      and(
        between(transactions.occurredOn, from, to),
        eq(transactions.type, 'savings'),
      ),
    );
  return row?.total ?? 0;
}

export interface CategoryTotal {
  categoryId: number | null;
  name: string;
  color: string;
  icon: string;
  total: number;
}

/** カテゴリ別の合計。円グラフと予算画面の両方で使う */
export async function totalsByCategory(
  from: IsoDate,
  to: IsoDate,
  type: EntryType,
): Promise<CategoryTotal[]> {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      name: categories.name,
      color: categories.color,
      icon: categories.icon,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .leftJoin(savingsGoals, eq(transactions.savingsGoalId, savingsGoals.id))
    .where(
      and(
        between(transactions.occurredOn, from, to),
        eq(transactions.type, type),
      ),
    )
    .groupBy(transactions.categoryId)
    .orderBy(desc(sql`sum(${transactions.amount})`));

  return rows.map((r) => ({
    categoryId: r.categoryId,
    name: r.name ?? '未分類',
    color: r.color ?? '#868E96',
    icon: r.icon ?? 'shape',
    total: r.total ?? 0,
  }));
}

export function totalsByCategoryForMonth(ym: YearMonth, type: EntryType) {
  const [from, to] = monthRange(ym);
  return totalsByCategory(from, to, type);
}

/** 年間推移グラフ用に、月ごとの収入・支出を返す（1-12月、データのない月は0） */
export async function monthlyTotalsForYear(year: number): Promise<
  { month: number; income: number; expense: number; savings: number }[]
> {
  const [from, to] = yearRange(year);
  const rows = await db
    .select({
      month: sql<string>`strftime('%m', ${transactions.occurredOn})`,
      type: transactions.type,
      total: sql<number>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .where(between(transactions.occurredOn, from, to))
    .groupBy(sql`strftime('%m', ${transactions.occurredOn})`, transactions.type);

  const result = Array.from({ length: 12 }, (_, i) => ({
    month: i + 1,
    income: 0,
    expense: 0,
    savings: 0,
  }));
  for (const row of rows) {
    const idx = Number(row.month) - 1;
    if (idx < 0 || idx > 11) continue;
    if (row.type === 'income') result[idx].income = row.total ?? 0;
    else if (row.type === 'savings') result[idx].savings = row.total ?? 0;
    else result[idx].expense = row.total ?? 0;
  }
  return result;
}

/** 入力欄側で maxLength を掛けられないぶん、保存時に丸める（→ TextField の説明を参照） */
export const MEMO_MAX = 200;

function normalizeMemo(memo: string | null | undefined): string | null {
  return memo?.trim().slice(0, MEMO_MAX) || null;
}

export interface TransactionInput {
  type: EntryType;
  amount: number;
  occurredOn: IsoDate;
  categoryId: number | null;
  /** type = 'savings' のときの積立先 */
  savingsGoalId?: number | null;
  memo?: string | null;
}

export async function create(input: TransactionInput): Promise<number> {
  const [row] = await db
    .insert(transactions)
    .values({
      ...input,
      savingsGoalId: input.savingsGoalId ?? null,
      memo: normalizeMemo(input.memo),
    })
    .returning({ id: transactions.id });
  return row.id;
}

export async function update(
  id: number,
  input: TransactionInput,
): Promise<void> {
  await db
    .update(transactions)
    .set({
      ...input,
      savingsGoalId: input.savingsGoalId ?? null,
      memo: normalizeMemo(input.memo),
      updatedAt: sql`(current_timestamp)`,
    })
    .where(eq(transactions.id, id));
}

export async function remove(id: number): Promise<void> {
  await db.delete(transactions).where(eq(transactions.id, id));
}

/**
 * 期間を指定してまとめて記録する（固定費を「継続」ではなく「即時一括」で入れる場合）。
 *
 * 生成されるのは通常の取引で、固定費（recurrings）の行は作らない。
 * つまり recurring_id が付かないため、二重生成をユニーク索引で防ぐことができない。
 * 呼び出し側は必ず件数を見せて確認を取ること。
 */
export async function createMany(
  base: Omit<TransactionInput, 'occurredOn'>,
  dates: IsoDate[],
): Promise<number> {
  if (dates.length === 0) return 0;
  const memo = normalizeMemo(base.memo);
  const rows = dates.map((occurredOn) => ({
    ...base,
    savingsGoalId: base.savingsGoalId ?? null,
    memo,
    occurredOn,
  }));

  // 1件でも失敗したら全部なかったことにする（中途半端に入るのが最悪）
  await db.transaction(async (tx) => {
    // SQLite の変数上限（既定 999）に当たらないよう分割して流す
    const CHUNK = 100;
    for (let i = 0; i < rows.length; i += CHUNK) {
      await tx.insert(transactions).values(rows.slice(i, i + CHUNK));
    }
  });
  return rows.length;
}

/** 固定費から生成する。二重生成はユニーク索引で弾かれるので無視する */
export async function createFromRecurring(
  input: TransactionInput & { recurringId: number },
): Promise<void> {
  await db.insert(transactions).values(input).onConflictDoNothing();
}

/** 支出のある最初の日付。データがなければ今日 */
export async function earliestDate(): Promise<IsoDate> {
  const [row] = await db
    .select({ min: sql<string | null>`min(${transactions.occurredOn})` })
    .from(transactions);
  return row?.min ?? today();
}

export async function countAll(): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions);
  return row?.count ?? 0;
}
