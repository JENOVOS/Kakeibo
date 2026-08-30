import assert from 'node:assert/strict';
import test from 'node:test';
import { summarize } from '@/domain/summary';

test('収支: 貯金も支出側として引く', () => {
  const s = summarize({ income: 300000, expense: 180000, savings: 50000 });
  assert.equal(s.outflow, 230000, '支出 + 貯金');
  assert.equal(s.balance, 70000, '収入 − 支出 − 貯金');
});

test('収支: 貯金がなければ従来どおり 収入 − 支出', () => {
  const s = summarize({ income: 300000, expense: 180000, savings: 0 });
  assert.equal(s.outflow, 180000);
  assert.equal(s.balance, 120000);
});

test('収支: 使いすぎれば負になる', () => {
  const s = summarize({ income: 100000, expense: 90000, savings: 30000 });
  assert.equal(s.outflow, 120000);
  assert.equal(s.balance, -20000);
});

test('収支: すべて0', () => {
  const s = summarize({ income: 0, expense: 0, savings: 0 });
  assert.deepEqual(s, {
    income: 0,
    expense: 0,
    savings: 0,
    outflow: 0,
    balance: 0,
  });
});

test('収支: 収入がなく貯金だけでも成り立つ', () => {
  const s = summarize({ income: 0, expense: 0, savings: 20000 });
  assert.equal(s.outflow, 20000);
  assert.equal(s.balance, -20000, '手元からは出ていっている');
});
