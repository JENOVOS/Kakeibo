import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

/**
 * 金額はすべて INTEGER（円 = 最小通貨単位）で保持する。
 * 浮動小数を使うと合計・按分で必ず誤差が出るため、DB にもロジックにも小数を持ち込まない。
 *
 * 日付はすべて 'YYYY-MM-DD' の TEXT。SQLite は日付型を持たないが、
 * この形式なら辞書順 = 時系列順になり、BETWEEN で月次集計がそのまま書ける。
 */

/**
 * 取引の種別。
 *
 * 貯金は「支出の一種」ではなく独立した種別にしている。
 * 支出に混ぜると生活費の集計と予算の消化率が実態より膨らみ、
 * 収入に混ぜると入ってきたお金として二重に数えてしまう。
 * 別種別なら既存の集計（income / expense）はそのままで、
 * 貯金だけを足し引きできる。
 */
export const ENTRY_TYPES = ['expense', 'income', 'savings'] as const;
export type EntryType = (typeof ENTRY_TYPES)[number];

/** カテゴリが存在するのは支出と収入だけ。貯金は「目標」が分類の役割を持つ */
export const CATEGORY_TYPES = ['expense', 'income'] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

/* ------------------------------------------------------------------ */
/* カテゴリ                                                             */
/* ------------------------------------------------------------------ */

export const categories = sqliteTable(
  'categories',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** 支出カテゴリと収入カテゴリを同一テーブルで type により分離する */
    type: text('type', { enum: CATEGORY_TYPES }).notNull(),
    name: text('name').notNull(),
    /** @expo/vector-icons (MaterialCommunityIcons) の名前 */
    icon: text('icon').notNull().default('shape'),
    color: text('color').notNull().default('#868E96'),
    sortOrder: integer('sort_order').notNull().default(0),
    /** 使わなくなったカテゴリは削除せずアーカイブする（過去の取引を壊さないため） */
    isArchived: integer('is_archived', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => [
    index('idx_categories_type').on(t.type, t.isArchived, t.sortOrder),
    uniqueIndex('uq_categories_type_name').on(t.type, t.name),
  ],
);

/* ------------------------------------------------------------------ */
/* 貯金の目標                                                           */
/* ------------------------------------------------------------------ */

/**
 * 「何のために・いくら・いつまでに」貯めるかの目標。
 * 貯めた額は目標に紐づく transactions（type = 'savings'）の合計で求める。
 * 残高カラムを持たせないのは、取引と残高がずれる余地を作らないため。
 */
export const savingsGoals = sqliteTable(
  'savings_goals',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    /** 目的（「沖縄旅行」「引っ越し費用」など） */
    name: text('name').notNull(),
    /** 目標金額（円） */
    targetAmount: integer('target_amount').notNull(),
    /** 目標日 'YYYY-MM-DD'。NULL = 期限なし */
    targetDate: text('target_date'),
    memo: text('memo'),
    icon: text('icon').notNull().default('piggy-bank'),
    color: text('color').notNull().default('#2FA37B'),
    sortOrder: integer('sort_order').notNull().default(0),
    /** 達成済み・中止した目標は消さずにアーカイブする（履歴を壊さないため） */
    isArchived: integer('is_archived', { mode: 'boolean' })
      .notNull()
      .default(false),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => [index('idx_savings_goals_active').on(t.isArchived, t.sortOrder)],
);

/* ------------------------------------------------------------------ */
/* 固定費・定期収入                                                      */
/* ------------------------------------------------------------------ */

export const RECURRENCE_KINDS = ['monthly', 'yearly', 'weekly'] as const;
export type RecurrenceKind = (typeof RECURRENCE_KINDS)[number];

export const recurrings = sqliteTable(
  'recurrings',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    type: text('type', { enum: ENTRY_TYPES }).notNull(),
    amount: integer('amount').notNull(),
    categoryId: integer('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    /** type = 'savings' のときの積立先 */
    savingsGoalId: integer('savings_goal_id').references(() => savingsGoals.id, {
      onDelete: 'set null',
    }),
    memo: text('memo'),

    kind: text('kind', { enum: RECURRENCE_KINDS }).notNull(),
    /** monthly: 1-31（月末に満たない月は月末に丸める） / weekly: 0=日曜〜6=土曜 / yearly: 日 */
    day: integer('day').notNull(),
    /** yearly のときの月 (1-12)。それ以外は null */
    month: integer('month'),

    startsOn: text('starts_on').notNull(),
    endsOn: text('ends_on'),
    /** 次に取引を生成すべき日。生成のたびに前進させる */
    nextDueOn: text('next_due_on').notNull(),

    /** true: アプリ起動時に自動で取引を作る / false: 通知だけ出して手動確定 */
    autoPost: integer('auto_post', { mode: 'boolean' }).notNull().default(true),
    /** 発生の何日前にローカル通知を出すか。null = 通知しない */
    notifyDaysBefore: integer('notify_days_before'),

    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => [index('idx_recurrings_due').on(t.isActive, t.nextDueOn)],
);

/* ------------------------------------------------------------------ */
/* 取引（支出・収入）                                                    */
/* ------------------------------------------------------------------ */

export const transactions = sqliteTable(
  'transactions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type', { enum: ENTRY_TYPES }).notNull(),
    /** 正の整数のみ。符号ではなく type で収支を判別する */
    amount: integer('amount').notNull(),
    /** 'YYYY-MM-DD' */
    occurredOn: text('occurred_on').notNull(),
    categoryId: integer('category_id').references(() => categories.id, {
      onDelete: 'set null',
    }),
    /** type = 'savings' のときの積立先。目標を消しても取引自体は残す */
    savingsGoalId: integer('savings_goal_id').references(() => savingsGoals.id, {
      onDelete: 'set null',
    }),
    memo: text('memo'),
    /** 固定費から生成された取引はここに元レコードを持つ */
    recurringId: integer('recurring_id').references(() => recurrings.id, {
      onDelete: 'set null',
    }),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => [
    index('idx_transactions_date').on(t.occurredOn),
    index('idx_transactions_type_date').on(t.type, t.occurredOn),
    index('idx_transactions_category').on(t.categoryId, t.occurredOn),
    index('idx_transactions_goal').on(t.savingsGoalId, t.occurredOn),
    /** 同じ固定費から同じ日に二重生成しないための保険 */
    uniqueIndex('uq_transactions_recurring_date')
      .on(t.recurringId, t.occurredOn)
      .where(sql`recurring_id is not null`),
  ],
);

/* ------------------------------------------------------------------ */
/* 予算                                                                */
/* ------------------------------------------------------------------ */

export const BUDGET_PERIODS = ['monthly', 'yearly'] as const;
export type BudgetPeriod = (typeof BUDGET_PERIODS)[number];

/**
 * 予算の解決順は「特定期間の行 → 既定行」。
 *   year = 0            … 既定（毎月/毎年ずっと適用される値）
 *   year = 2026, month = 4 … その月だけの上書き
 *   categoryId = null   … カテゴリ横断の全体予算
 * これにより「毎月の食費は3万、ただし12月だけ5万」を行の追加だけで表現できる。
 */
export const budgets = sqliteTable(
  'budgets',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    period: text('period', { enum: BUDGET_PERIODS }).notNull(),
    /** 0 = 既定 */
    year: integer('year').notNull().default(0),
    /** monthly のみ 1-12。yearly / 既定 は 0 */
    month: integer('month').notNull().default(0),
    categoryId: integer('category_id').references(() => categories.id, {
      onDelete: 'cascade',
    }),
    amount: integer('amount').notNull(),
    createdAt: text('created_at')
      .notNull()
      .default(sql`(current_timestamp)`),
  },
  (t) => [
    // SQLite の UNIQUE は NULL 同士を別物として扱うため、
    // 全体予算（category_id IS NULL）とカテゴリ別で索引を分ける必要がある。
    uniqueIndex('uq_budgets_overall')
      .on(t.period, t.year, t.month)
      .where(sql`category_id is null`),
    uniqueIndex('uq_budgets_category')
      .on(t.period, t.year, t.month, t.categoryId)
      .where(sql`category_id is not null`),
  ],
);

/* ------------------------------------------------------------------ */
/* アプリ設定（Key-Value）                                               */
/* ------------------------------------------------------------------ */

export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
export type Budget = typeof budgets.$inferSelect;
export type NewBudget = typeof budgets.$inferInsert;
export type Recurring = typeof recurrings.$inferSelect;
export type NewRecurring = typeof recurrings.$inferInsert;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type NewSavingsGoal = typeof savingsGoals.$inferInsert;
