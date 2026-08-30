export interface Totals {
  income: number;
  expense: number;
  savings: number;
}

export interface Summary extends Totals {
  /** 支出 + 貯金。手元から出ていった総額 */
  outflow: number;
  /** 収入 − 支出 − 貯金。手元に残った額 */
  balance: number;
}

/**
 * 期間の収支をまとめる。
 *
 * 貯金は「出ていったお金」として支出と同じ側に置く。
 * 積立に回した額を収支に残したままだと、まだ使えるお金を多く見積もってしまい、
 * 月末に足りなくなる。置き場所が変わっただけでも、
 * 家計簿として見たいのは「あといくら使えるか」なので支出側で数える。
 *
 * 集計そのものは SQL でやるが、この足し引きだけは意味が変わりやすいので
 * 純関数として切り出し、テストで固定している。
 */
export function summarize({ income, expense, savings }: Totals): Summary {
  const outflow = expense + savings;
  return { income, expense, savings, outflow, balance: income - outflow };
}
