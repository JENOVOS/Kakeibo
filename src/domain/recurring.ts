import { addDays, addMonths, addWeeks, addYears, isAfter } from 'date-fns';
import type { Recurring } from '@/db/schema';
import { daysInMonth, fromIso, toIso, type IsoDate } from './period';

/**
 * 固定費の「次の発生日」を求める。
 *
 * rrule のような汎用ライブラリは家計簿の固定費には過剰で、
 * 毎月N日 / 毎年M月N日 / 毎週W曜 の3種類でほぼ全ての実例を賄える。
 */

type Rule = Pick<Recurring, 'kind' | 'day' | 'month' | 'startsOn' | 'endsOn'>;

/** 毎月N日。N がその月に存在しない場合（2月31日など）は月末に丸める */
function monthlyOccurrence(year: number, month: number, day: number): Date {
  const clamped = Math.min(day, daysInMonth(year, month));
  return new Date(year, month - 1, clamped);
}

/**
 * from（含む）以降で最初に発生する日を返す。
 * 終了日を過ぎている場合は null。
 */
export function nextOccurrenceOnOrAfter(
  rule: Rule,
  from: IsoDate,
): IsoDate | null {
  const start = fromIso(rule.startsOn);
  const cursorStart = fromIso(from);
  // 開始日より前は発生しない
  let base = isAfter(start, cursorStart) ? start : cursorStart;
  base = new Date(base.getFullYear(), base.getMonth(), base.getDate());

  let result: Date;

  switch (rule.kind) {
    case 'monthly': {
      let candidate = monthlyOccurrence(
        base.getFullYear(),
        base.getMonth() + 1,
        rule.day,
      );
      if (candidate < base) {
        const next = addMonths(base, 1);
        candidate = monthlyOccurrence(
          next.getFullYear(),
          next.getMonth() + 1,
          rule.day,
        );
      }
      result = candidate;
      break;
    }
    case 'yearly': {
      const month = rule.month ?? 1;
      let candidate = monthlyOccurrence(base.getFullYear(), month, rule.day);
      if (candidate < base) {
        candidate = monthlyOccurrence(base.getFullYear() + 1, month, rule.day);
      }
      result = candidate;
      break;
    }
    case 'weekly': {
      const target = rule.day; // 0=日曜
      const diff = (target - base.getDay() + 7) % 7;
      result = addDays(base, diff);
      break;
    }
  }

  if (rule.endsOn && isAfter(result, fromIso(rule.endsOn))) return null;
  return toIso(result);
}

/** ある発生日の「次」を返す（生成後にカーソルを前進させるため） */
export function advanceAfter(rule: Rule, occurred: IsoDate): IsoDate | null {
  const d = fromIso(occurred);
  let probe: Date;
  switch (rule.kind) {
    case 'monthly':
      probe = addMonths(d, 1);
      break;
    case 'yearly':
      probe = addYears(d, 1);
      break;
    case 'weekly':
      probe = addWeeks(d, 1);
      break;
  }
  // 月末丸めで日がずれるため、必ず nextOccurrence を通して正規化する
  return nextOccurrenceOnOrAfter(rule, toIso(probe));
}

/**
 * 一度に生成できる件数の上限。
 * 「毎週 × 10年」のような指定でも端末が固まらないようにするための歯止め。
 */
export const MAX_OCCURRENCES = 500;

/**
 * from〜to（両端を含む）に発生する日をすべて列挙する。
 *
 * 「定期的に自動追加」ではなく「期間を指定して今すぐまとめて追加」を選んだときに使う。
 * 上限に達したら打ち切り、truncated を true にして呼び出し側に知らせる
 * （黙って一部だけ作ると、ユーザーは足りないことに気づけない）。
 */
export function enumerateOccurrences(
  rule: Rule,
  from: IsoDate,
  to: IsoDate,
): { dates: IsoDate[]; truncated: boolean } {
  const dates: IsoDate[] = [];
  if (to < from) return { dates, truncated: false };

  let cursor = nextOccurrenceOnOrAfter(rule, from);
  while (cursor && cursor <= to) {
    if (dates.length >= MAX_OCCURRENCES) {
      return { dates, truncated: true };
    }
    dates.push(cursor);
    cursor = advanceAfter(rule, cursor);
  }
  return { dates, truncated: false };
}

const KIND_LABEL: Record<Recurring['kind'], string> = {
  monthly: '毎月',
  yearly: '毎年',
  weekly: '毎週',
};

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export function describeRule(rule: Rule): string {
  switch (rule.kind) {
    case 'monthly':
      return rule.day >= 31 ? '毎月 月末' : `毎月 ${rule.day}日`;
    case 'yearly':
      return `毎年 ${rule.month ?? 1}月${rule.day}日`;
    case 'weekly':
      return `毎週 ${WEEKDAYS[rule.day] ?? '?'}曜日`;
    default:
      return KIND_LABEL[rule.kind];
  }
}
