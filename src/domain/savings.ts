import { differenceInCalendarDays, differenceInCalendarMonths } from 'date-fns';
import { fromIso, today, type IsoDate } from './period';

/**
 * 貯金の進捗と見通し。
 *
 * 「あといくら」だけでは続かないので、
 * 「このペースなら間に合うのか」まで出せるようにしている。
 * DB に依存しない純関数なので、境界（目標日ちょうど、積立ゼロ、達成済み）を
 * テストで固定できる。
 */

export interface GoalProgress {
  saved: number;
  target: number;
  remaining: number;
  /** 0〜1 に丸めない生の達成率（超過も見えるようにするため） */
  ratio: number;
  achieved: boolean;
}

export function progressOf(saved: number, target: number): GoalProgress {
  const remaining = Math.max(0, target - saved);
  return {
    saved,
    target,
    remaining,
    ratio: target > 0 ? saved / target : 0,
    achieved: target > 0 && saved >= target,
  };
}

/** 目標日までの残り日数。期限なしなら null、当日は 0、過ぎていれば負 */
export function daysUntil(targetDate: IsoDate | null, from: IsoDate = today()): number | null {
  if (!targetDate) return null;
  return differenceInCalendarDays(fromIso(targetDate), fromIso(from));
}

/**
 * 目標日に間に合わせるために、1か月あたりいくら積む必要があるか。
 * 期限なし・達成済み・目標日を過ぎている場合は null。
 */
export function requiredMonthlyPace(
  remaining: number,
  targetDate: IsoDate | null,
  from: IsoDate = today(),
): number | null {
  if (!targetDate || remaining <= 0) return null;
  const months = differenceInCalendarMonths(fromIso(targetDate), fromIso(from));
  if (months < 0) return null;
  // 同月内に期限が来る場合も「1か月ぶん」として扱う（0除算を避ける）
  return Math.ceil(remaining / Math.max(1, months));
}

/**
 * これまでの積立ペースから、目標に到達する見込み月数を返す。
 *
 * monthsElapsed は最初の積立からの経過月数。まだ1か月経っていなくても
 * 1として扱う（分母が 0 になるとペースが無限大になり、
 * 「今月中に到達」という誤った見通しを出してしまう）。
 */
export function monthsToReach(
  saved: number,
  target: number,
  monthsElapsed: number,
): number | null {
  if (saved <= 0 || target <= saved) return null;
  const rate = saved / Math.max(1, monthsElapsed);
  if (rate <= 0) return null;
  return Math.ceil((target - saved) / rate);
}

/** 目標日に対して、今のペースで間に合うか */
export type Outlook = 'achieved' | 'onTrack' | 'behind' | 'unknown';

export function outlook(
  progress: GoalProgress,
  targetDate: IsoDate | null,
  monthsElapsed: number,
  from: IsoDate = today(),
): Outlook {
  if (progress.achieved) return 'achieved';
  if (!targetDate) return 'unknown';
  const need = monthsToReach(progress.saved, progress.target, monthsElapsed);
  if (need === null) return 'unknown';
  const left = differenceInCalendarMonths(fromIso(targetDate), fromIso(from));
  return need <= left ? 'onTrack' : 'behind';
}
