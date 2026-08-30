import {
  addMonths,
  endOfMonth,
  format,
  lastDayOfMonth,
  parseISO,
  startOfMonth,
} from 'date-fns';

/** アプリ内の日付は一貫して 'YYYY-MM-DD' の文字列で扱う */
export type IsoDate = string;

export const DATE_FMT = 'yyyy-MM-dd';

export function toIso(date: Date): IsoDate {
  return format(date, DATE_FMT);
}

export function fromIso(date: IsoDate): Date {
  return parseISO(date);
}

export function today(): IsoDate {
  return toIso(new Date());
}

export interface YearMonth {
  year: number;
  month: number; // 1-12
}

export function currentYearMonth(): YearMonth {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function yearMonthOf(date: IsoDate): YearMonth {
  const d = fromIso(date);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

export function shiftMonth({ year, month }: YearMonth, delta: number): YearMonth {
  const d = addMonths(new Date(year, month - 1, 1), delta);
  return { year: d.getFullYear(), month: d.getMonth() + 1 };
}

/** 月の範囲を [開始日, 終了日] の ISO 文字列で返す。BETWEEN にそのまま使える */
export function monthRange({ year, month }: YearMonth): [IsoDate, IsoDate] {
  const base = new Date(year, month - 1, 1);
  return [toIso(startOfMonth(base)), toIso(endOfMonth(base))];
}

export function yearRange(year: number): [IsoDate, IsoDate] {
  return [`${year}-01-01`, `${year}-12-31`];
}

export function formatYearMonth({ year, month }: YearMonth): string {
  return `${year}年${month}月`;
}

export function formatMonthDay(date: IsoDate): string {
  const d = fromIso(date);
  return format(d, 'M/d');
}

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function formatDateLong(date: IsoDate): string {
  const d = fromIso(date);
  return `${format(d, 'yyyy年M月d日')}(${WEEKDAYS[d.getDay()]})`;
}

export function formatDateMedium(date: IsoDate): string {
  const d = fromIso(date);
  return `${format(d, 'M月d日')}(${WEEKDAYS[d.getDay()]})`;
}

/** その月が何日あるか。月末指定の固定費の丸めに使う */
export function daysInMonth(year: number, month: number): number {
  return lastDayOfMonth(new Date(year, month - 1, 1)).getDate();
}

/** 月の何日目まで経過したか / 月の日数 → 予算のペース判定に使う */
export function monthProgress(ym: YearMonth, at: Date = new Date()): number {
  const total = daysInMonth(ym.year, ym.month);
  const isCurrent =
    at.getFullYear() === ym.year && at.getMonth() + 1 === ym.month;
  if (!isCurrent) {
    const cursor = new Date(ym.year, ym.month - 1, 1);
    return cursor > at ? 0 : 1;
  }
  return at.getDate() / total;
}
