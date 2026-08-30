import { semantic } from '@/theme';
import type { EntryType } from '@/db/schema';

export interface Classification {
  /** 一覧に出す分類名 */
  label: string;
  icon: string;
  color: string;
}

interface Source {
  type: EntryType;
  categoryName?: string | null;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  goalName?: string | null;
  goalIcon?: string | null;
  goalColor?: string | null;
}

/**
 * 取引・固定費の「分類」の出し方を1か所にまとめる。
 *
 * 貯金にはカテゴリが付かない（分類の役割は積立先の目標が担う）ので、
 * カテゴリだけを見ていると「未分類」と表示されてしまう。
 * 種別が貯金なら目標側を見る、という判断をここに閉じ込めておく。
 */
export function classify(row: Source, fallbackColor: string): Classification {
  if (row.type === 'savings') {
    return {
      label: row.goalName ? `貯金・${row.goalName}` : '貯金',
      icon: row.goalIcon ?? 'piggy-bank',
      color: row.goalColor ?? semantic.savings,
    };
  }
  return {
    label: row.categoryName ?? '未分類',
    icon: row.categoryIcon ?? 'shape',
    color: row.categoryColor ?? fallbackColor,
  };
}
