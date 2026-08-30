import assert from 'node:assert/strict';
import test from 'node:test';
import {
  advanceAfter,
  describeRule,
  enumerateOccurrences,
  MAX_OCCURRENCES,
  nextOccurrenceOnOrAfter,
} from '@/domain/recurring';
import {
  daysInMonth,
  monthRange,
  monthProgress,
  shiftMonth,
  yearRange,
} from '@/domain/period';
import {
  formatSignedYen,
  formatYen,
  parseYen,
  ratio,
} from '@/domain/money';

const monthly = (day: number, startsOn = '2026-01-01', endsOn: string | null = null) =>
  ({ kind: 'monthly' as const, day, month: null, startsOn, endsOn });

test('金額のパース: 全角・カンマ・円記号を受け付ける', () => {
  assert.equal(parseYen('1234'), 1234);
  assert.equal(parseYen('1,234'), 1234);
  assert.equal(parseYen('１２３４'), 1234);
  assert.equal(parseYen('¥1,000'), 1000);
  assert.equal(parseYen('1234.9'), 1234, '小数は切り捨て');
  assert.equal(parseYen('abc'), null);
  assert.equal(parseYen(''), null);
  assert.equal(parseYen('-100'), null, 'マイナスは type で表すので受け付けない');
});

test('金額の表示', () => {
  assert.equal(formatYen(1234567), '¥1,234,567');
  assert.equal(formatSignedYen(-500), '-¥500');
  assert.equal(formatSignedYen(500), '+¥500');
  assert.equal(formatSignedYen(0), '¥0');
  assert.equal(ratio(100, 0), 0, '予算0で除算しない');
});

test('月の範囲', () => {
  assert.deepEqual(monthRange({ year: 2026, month: 2 }), ['2026-02-01', '2026-02-28']);
  assert.deepEqual(monthRange({ year: 2024, month: 2 }), ['2024-02-01', '2024-02-29'], 'うるう年');
  assert.deepEqual(monthRange({ year: 2026, month: 12 }), ['2026-12-01', '2026-12-31']);
  assert.deepEqual(yearRange(2026), ['2026-01-01', '2026-12-31']);
  assert.deepEqual(shiftMonth({ year: 2026, month: 12 }, 1), { year: 2027, month: 1 });
  assert.deepEqual(shiftMonth({ year: 2026, month: 1 }, -1), { year: 2025, month: 12 });
  assert.equal(daysInMonth(2026, 2), 28);
});

test('固定費: 毎月25日', () => {
  const rule = monthly(25);
  assert.equal(nextOccurrenceOnOrAfter(rule, '2026-01-01'), '2026-01-25');
  assert.equal(nextOccurrenceOnOrAfter(rule, '2026-01-25'), '2026-01-25', '当日は含む');
  assert.equal(nextOccurrenceOnOrAfter(rule, '2026-01-26'), '2026-02-25');
  assert.equal(advanceAfter(rule, '2026-01-25'), '2026-02-25');
  assert.equal(advanceAfter(rule, '2026-12-25'), '2027-01-25', '年をまたぐ');
});

test('固定費: 毎月31日は短い月で月末に丸める', () => {
  const rule = monthly(31);
  assert.equal(nextOccurrenceOnOrAfter(rule, '2026-02-01'), '2026-02-28');
  assert.equal(
    nextOccurrenceOnOrAfter(monthly(31, '2024-01-01'), '2024-02-01'),
    '2024-02-29',
    'うるう年',
  );
  assert.equal(nextOccurrenceOnOrAfter(rule, '2026-04-01'), '2026-04-30', '30日の月');
  assert.equal(advanceAfter(rule, '2026-01-31'), '2026-02-28');
  assert.equal(advanceAfter(rule, '2026-02-28'), '2026-03-31', '丸めた翌月は31日に戻る');
  assert.equal(advanceAfter(rule, '2026-04-30'), '2026-05-31');
});

test('固定費: 開始日より前には発生しない', () => {
  const rule = monthly(10, '2026-06-01');
  assert.equal(nextOccurrenceOnOrAfter(rule, '2026-01-01'), '2026-06-10');
});

test('固定費: 終了日を過ぎたら null', () => {
  const rule = monthly(10, '2026-01-01', '2026-03-31');
  assert.equal(nextOccurrenceOnOrAfter(rule, '2026-03-01'), '2026-03-10');
  assert.equal(nextOccurrenceOnOrAfter(rule, '2026-04-01'), null);
  assert.equal(advanceAfter(rule, '2026-03-10'), null, '最終回の次は無し');
});

test('固定費: 毎年', () => {
  const rule = { kind: 'yearly' as const, day: 15, month: 4, startsOn: '2026-01-01', endsOn: null };
  assert.equal(nextOccurrenceOnOrAfter(rule, '2026-01-01'), '2026-04-15');
  assert.equal(nextOccurrenceOnOrAfter(rule, '2026-04-16'), '2027-04-15');
  assert.equal(advanceAfter(rule, '2026-04-15'), '2027-04-15');
});

test('固定費: 毎週', () => {
  // 2026-08-30 は日曜
  const rule = { kind: 'weekly' as const, day: 3, month: null, startsOn: '2026-01-01', endsOn: null };
  const next = nextOccurrenceOnOrAfter(rule, '2026-08-30');
  assert.equal(next, '2026-09-02', '次の水曜');
  assert.equal(new Date(next!).getUTCDay(), 3);
  assert.equal(advanceAfter(rule, '2026-09-02'), '2026-09-09');
});

test('固定費: 長期間放置しても順に前進できる', () => {
  const rule = monthly(1);
  let cursor: string | null = '2026-01-01';
  const seen: string[] = [];
  while (cursor && cursor <= '2026-12-31') {
    seen.push(cursor);
    cursor = advanceAfter(rule, cursor);
  }
  assert.equal(seen.length, 12, '1年で12回');
  assert.equal(seen[0], '2026-01-01');
  assert.equal(seen[11], '2026-12-01');
});

test('規則の説明文', () => {
  assert.equal(describeRule(monthly(25)), '毎月 25日');
  assert.equal(describeRule(monthly(31)), '毎月 月末');
  assert.equal(
    describeRule({ kind: 'yearly', day: 15, month: 4, startsOn: '2026-01-01', endsOn: null }),
    '毎年 4月15日',
  );
  assert.equal(
    describeRule({ kind: 'weekly', day: 1, month: null, startsOn: '2026-01-01', endsOn: null }),
    '毎週 月曜日',
  );
});

test('月の経過割合', () => {
  const ym = { year: 2026, month: 4 };
  assert.equal(monthProgress(ym, new Date(2026, 3, 15)), 0.5);
  assert.equal(monthProgress(ym, new Date(2026, 5, 1)), 1, '過去の月は完了扱い');
  assert.equal(monthProgress(ym, new Date(2026, 1, 1)), 0, '未来の月は0');
});

test('一括追加: 期間内の発生日をすべて列挙する', () => {
  const rule = monthly(25);
  const { dates, truncated } = enumerateOccurrences(rule, '2026-01-01', '2026-06-30');
  assert.deepEqual(dates, [
    '2026-01-25', '2026-02-25', '2026-03-25',
    '2026-04-25', '2026-05-25', '2026-06-25',
  ]);
  assert.equal(truncated, false);
});

test('一括追加: 両端を含む', () => {
  const rule = monthly(10);
  const { dates } = enumerateOccurrences(rule, '2026-03-10', '2026-05-10');
  assert.deepEqual(dates, ['2026-03-10', '2026-04-10', '2026-05-10']);
});

test('一括追加: 月末の丸めが効く', () => {
  const rule = monthly(31);
  const { dates } = enumerateOccurrences(rule, '2026-01-01', '2026-04-30');
  assert.deepEqual(dates, ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
});

test('一括追加: 開始日と終了日の制約を守る', () => {
  const rule = monthly(15, '2026-03-01', '2026-08-31');
  const { dates } = enumerateOccurrences(rule, '2026-01-01', '2026-12-31');
  assert.equal(dates[0], '2026-03-15', '規則の開始日より前は出ない');
  assert.equal(dates[dates.length - 1], '2026-08-15', '規則の終了日より後は出ない');
});

test('一括追加: 終了日が開始日より前なら空', () => {
  const { dates, truncated } = enumerateOccurrences(monthly(1), '2026-06-01', '2026-05-01');
  assert.deepEqual(dates, []);
  assert.equal(truncated, false);
});

test('一括追加: 上限に達したら打ち切って知らせる', () => {
  const rule = { kind: 'weekly' as const, day: 1, month: null, startsOn: '2000-01-01', endsOn: null };
  const { dates, truncated } = enumerateOccurrences(rule, '2000-01-01', '2050-12-31');
  assert.equal(dates.length, MAX_OCCURRENCES, '上限で止まる');
  assert.equal(truncated, true, '打ち切ったことを伝える');
});

test('一括追加: 毎年は1年に1件', () => {
  const rule = { kind: 'yearly' as const, day: 1, month: 4, startsOn: '2020-01-01', endsOn: null };
  const { dates } = enumerateOccurrences(rule, '2024-01-01', '2027-12-31');
  assert.deepEqual(dates, ['2024-04-01', '2025-04-01', '2026-04-01', '2027-04-01']);
});
