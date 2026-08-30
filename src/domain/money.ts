/**
 * 金額は常に整数（円）。表示のときだけ書式化する。
 */

const formatter = new Intl.NumberFormat('ja-JP');

export function formatYen(amount: number): string {
  return `¥${formatter.format(amount)}`;
}

export function formatNumber(amount: number): string {
  return formatter.format(amount);
}

/** 符号付きで表示する（収支の差額など） */
export function formatSignedYen(amount: number): string {
  const sign = amount > 0 ? '+' : amount < 0 ? '-' : '';
  return `${sign}¥${formatter.format(Math.abs(amount))}`;
}

/**
 * 入力欄の文字列を円の整数に変換する。
 * 全角数字・カンマ・空白を許容し、小数以下は切り捨てる。
 */
export function parseYen(input: string): number | null {
  if (!input) return null;
  const normalized = input
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/[,，\s¥￥]/g, '')
    .replace(/[．]/g, '.');
  if (!/^\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Math.floor(Number(normalized));
  return Number.isFinite(value) ? value : null;
}

/** 0 除算を避けつつ消化率を返す（0.0〜） */
export function ratio(spent: number, budget: number): number {
  if (budget <= 0) return 0;
  return spent / budget;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
