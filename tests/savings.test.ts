import assert from 'node:assert/strict';
import test from 'node:test';
import {
  daysUntil,
  monthsToReach,
  outlook,
  progressOf,
  requiredMonthlyPace,
} from '@/domain/savings';

test('貯金の進捗', () => {
  const p = progressOf(30000, 100000);
  assert.equal(p.remaining, 70000);
  assert.equal(p.ratio, 0.3);
  assert.equal(p.achieved, false);
});

test('貯金の進捗: 達成と超過', () => {
  const exact = progressOf(100000, 100000);
  assert.equal(exact.achieved, true);
  assert.equal(exact.remaining, 0);

  const over = progressOf(120000, 100000);
  assert.equal(over.achieved, true);
  assert.equal(over.remaining, 0, '残りは負にしない');
  assert.equal(over.ratio, 1.2, '達成率は 100% を超えて見せる');
});

test('貯金の進捗: 目標金額が0でも0除算しない', () => {
  const p = progressOf(5000, 0);
  assert.equal(p.ratio, 0);
  assert.equal(p.achieved, false);
});

test('目標日までの残り日数', () => {
  assert.equal(daysUntil('2026-09-10', '2026-08-30'), 11);
  assert.equal(daysUntil('2026-08-30', '2026-08-30'), 0, '当日は0');
  assert.equal(daysUntil('2026-08-20', '2026-08-30'), -10, '過ぎたら負');
  assert.equal(daysUntil(null, '2026-08-30'), null, '期限なし');
});

test('必要な月あたり積立額', () => {
  // 2026-08-30 から 2026-12-30 は4か月
  assert.equal(requiredMonthlyPace(80000, '2026-12-30', '2026-08-30'), 20000);
  assert.equal(
    requiredMonthlyPace(50000, '2026-09-10', '2026-08-30'),
    50000,
    '同月内に期限が来ても1か月ぶんとして扱う',
  );
  assert.equal(requiredMonthlyPace(0, '2026-12-30', '2026-08-30'), null, '達成済み');
  assert.equal(requiredMonthlyPace(1000, null, '2026-08-30'), null, '期限なし');
  assert.equal(
    requiredMonthlyPace(1000, '2026-07-01', '2026-08-30'),
    null,
    '目標日を過ぎている',
  );
});

test('今のペースでの到達見込み月数', () => {
  // 3か月で3万貯めた → 月1万ペース。残り7万なら7か月
  assert.equal(monthsToReach(30000, 100000, 3), 7);
  assert.equal(monthsToReach(0, 100000, 3), null, '未積立なら見通せない');
  assert.equal(monthsToReach(100000, 100000, 3), null, '達成済み');
  assert.equal(
    monthsToReach(10000, 100000, 0),
    9,
    '経過0か月でも1か月として扱う（無限ペースにしない）',
  );
});

test('見通しの判定', () => {
  const p = progressOf(30000, 100000);
  // 月1万ペース、残り7万 → 7か月必要
  assert.equal(
    outlook(p, '2027-08-30', 3, '2026-08-30'),
    'onTrack',
    '12か月あるので間に合う',
  );
  assert.equal(
    outlook(p, '2026-11-30', 3, '2026-08-30'),
    'behind',
    '3か月では届かない',
  );
  assert.equal(outlook(progressOf(100000, 100000), '2026-11-30', 3), 'achieved');
  assert.equal(outlook(p, null, 3), 'unknown', '期限なしは判定しない');
  assert.equal(
    outlook(progressOf(0, 100000), '2026-11-30', 3, '2026-08-30'),
    'unknown',
    '未積立ならペースが出せない',
  );
});
