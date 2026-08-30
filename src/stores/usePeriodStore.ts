import { create } from 'zustand';
import {
  currentYearMonth,
  shiftMonth,
  type YearMonth,
} from '@/domain/period';

/**
 * 画面をまたいで共有する状態は「いま見ている年月」だけ。
 * それ以外は SQLite を唯一の真実として都度クエリする。
 */
interface PeriodState {
  yearMonth: YearMonth;
  next: () => void;
  prev: () => void;
  setYearMonth: (ym: YearMonth) => void;
  reset: () => void;
}

export const usePeriodStore = create<PeriodState>((set) => ({
  yearMonth: currentYearMonth(),
  next: () => set((s) => ({ yearMonth: shiftMonth(s.yearMonth, 1) })),
  prev: () => set((s) => ({ yearMonth: shiftMonth(s.yearMonth, -1) })),
  setYearMonth: (yearMonth) => set({ yearMonth }),
  reset: () => set({ yearMonth: currentYearMonth() }),
}));
