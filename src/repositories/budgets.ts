import { and, eq, isNull, or } from 'drizzle-orm';
import { db } from '@/db/client';
import { budgets, type BudgetPeriod } from '@/db/schema';
import { monthRange, yearRange, type YearMonth } from '@/domain/period';
import { ratio } from '@/domain/money';
import { semantic } from '@/theme';
import { savingsTotal, totalsByCategory } from './transactions';
import { listByType } from './categories';

/**
 * 予算の解決規則
 *   1. その年月に対する行があればそれを使う（year=2026, month=4）
 *   2. なければ既定行を使う（year=0, month=0）
 *   3. どちらも無ければ「予算未設定」
 * カテゴリ別と全体（categoryId = null）は独立に解決する。
 */

export interface ResolvedBudget {
  categoryId: number | null;
  amount: number;
  /** true = 既定値をそのまま使っている（その月固有の上書きがない） */
  isDefault: boolean;
}

async function resolve(
  period: BudgetPeriod,
  year: number,
  month: number,
): Promise<Map<number | null, ResolvedBudget>> {
  const rows = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.period, period),
        or(
          eq(budgets.year, 0),
          and(eq(budgets.year, year), eq(budgets.month, month)),
        ),
      ),
    );

  const resolved = new Map<number | null, ResolvedBudget>();
  // 既定行を先に入れ、特定期間の行で上書きする
  for (const row of rows.filter((r) => r.year === 0)) {
    resolved.set(row.categoryId, {
      categoryId: row.categoryId,
      amount: row.amount,
      isDefault: true,
    });
  }
  for (const row of rows.filter((r) => r.year !== 0)) {
    resolved.set(row.categoryId, {
      categoryId: row.categoryId,
      amount: row.amount,
      isDefault: false,
    });
  }
  return resolved;
}

export function resolveMonthly({ year, month }: YearMonth) {
  return resolve('monthly', year, month);
}

export function resolveYearly(year: number) {
  return resolve('yearly', year, 0);
}

/* ------------------------------------------------------------------ */
/* 進捗                                                                */
/* ------------------------------------------------------------------ */

export interface BudgetProgress {
  categoryId: number | null;
  name: string;
  color: string;
  icon: string;
  budget: number;
  spent: number;
  remaining: number;
  ratio: number;
  isDefault: boolean;
}

export interface BudgetOverview {
  /** 全体予算。未設定なら null */
  overall: BudgetProgress | null;
  /** 予算が設定されているカテゴリ（消化率の高い順） */
  tracked: BudgetProgress[];
  /** 予算未設定だが支出のあるカテゴリ */
  untracked: { name: string; color: string; icon: string; spent: number }[];
  totalSpent: number;
  totalBudget: number;
}

async function buildOverview(
  resolved: Map<number | null, ResolvedBudget>,
  from: string,
  to: string,
): Promise<BudgetOverview> {
  const [spentRows, saved] = await Promise.all([
    totalsByCategory(from, to, 'expense'),
    savingsTotal(from, to),
  ]);
  const spentByCategory = new Map(
    spentRows.map((r) => [r.categoryId, r] as const),
  );
  // 全体予算の消化には貯金も数える（貯金も手元から出ていくお金として扱うため）。
  // カテゴリ別予算には入らない ── 貯金にカテゴリは無いので、
  // 「予算未設定の支出」として下に並べる。
  const totalSpent = spentRows.reduce((sum, r) => sum + r.total, 0) + saved;

  const categoryList = await listByType('expense', true);
  const categoryById = new Map(categoryList.map((c) => [c.id, c] as const));

  const tracked: BudgetProgress[] = [];
  let totalBudget = 0;

  for (const [categoryId, budget] of resolved) {
    if (categoryId === null) continue;
    const category = categoryById.get(categoryId);
    if (!category) continue;
    const spent = spentByCategory.get(categoryId)?.total ?? 0;
    totalBudget += budget.amount;
    tracked.push({
      categoryId,
      name: category.name,
      color: category.color,
      icon: category.icon,
      budget: budget.amount,
      spent,
      remaining: budget.amount - spent,
      ratio: ratio(spent, budget.amount),
      isDefault: budget.isDefault,
    });
  }
  tracked.sort((a, b) => b.ratio - a.ratio);

  const untracked = spentRows
    .filter((r) => !resolved.has(r.categoryId) && r.total > 0)
    .map((r) => ({
      name: r.name,
      color: r.color,
      icon: r.icon,
      spent: r.total,
    }));
  if (saved > 0) {
    untracked.push({
      name: '貯金',
      color: semantic.savings,
      icon: 'piggy-bank',
      spent: saved,
    });
  }

  const overallBudget = resolved.get(null);
  const overall: BudgetProgress | null = overallBudget
    ? {
        categoryId: null,
        name: '全体',
        color: '#4C6EF5',
        icon: 'wallet',
        budget: overallBudget.amount,
        spent: totalSpent,
        remaining: overallBudget.amount - totalSpent,
        ratio: ratio(totalSpent, overallBudget.amount),
        isDefault: overallBudget.isDefault,
      }
    : null;

  return { overall, tracked, untracked, totalSpent, totalBudget };
}

export async function monthlyOverview(ym: YearMonth): Promise<BudgetOverview> {
  const [from, to] = monthRange(ym);
  return buildOverview(await resolveMonthly(ym), from, to);
}

export async function yearlyOverview(year: number): Promise<BudgetOverview> {
  const [from, to] = yearRange(year);
  return buildOverview(await resolveYearly(year), from, to);
}

/* ------------------------------------------------------------------ */
/* 更新                                                                */
/* ------------------------------------------------------------------ */

export interface BudgetKey {
  period: BudgetPeriod;
  /** 0 = 既定 */
  year: number;
  /** monthly のみ 1-12、それ以外は 0 */
  month: number;
  categoryId: number | null;
}

function keyCondition(key: BudgetKey) {
  return and(
    eq(budgets.period, key.period),
    eq(budgets.year, key.year),
    eq(budgets.month, key.month),
    key.categoryId === null
      ? isNull(budgets.categoryId)
      : eq(budgets.categoryId, key.categoryId),
  );
}

/**
 * 部分ユニーク索引が2本に分かれている（category_id の NULL 判定のため）ので、
 * ON CONFLICT ではなく明示的な検索 → 挿入/更新にしている。
 */
export async function setAmount(key: BudgetKey, amount: number): Promise<void> {
  if (amount <= 0) {
    await clear(key);
    return;
  }
  const [existing] = await db
    .select({ id: budgets.id })
    .from(budgets)
    .where(keyCondition(key))
    .limit(1);

  if (existing) {
    await db.update(budgets).set({ amount }).where(eq(budgets.id, existing.id));
  } else {
    await db.insert(budgets).values({ ...key, amount });
  }
}

export async function clear(key: BudgetKey): Promise<void> {
  await db.delete(budgets).where(keyCondition(key));
}

export async function getAmount(key: BudgetKey): Promise<number | null> {
  const [row] = await db
    .select({ amount: budgets.amount })
    .from(budgets)
    .where(keyCondition(key))
    .limit(1);
  return row?.amount ?? null;
}

/** 設定画面で「既定の予算」を一覧するため */
export async function listDefaults(period: BudgetPeriod) {
  return db
    .select()
    .from(budgets)
    .where(and(eq(budgets.period, period), eq(budgets.year, 0)));
}
