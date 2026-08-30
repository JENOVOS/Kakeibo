import { sql } from 'drizzle-orm';
import { db } from './client';
import { categories, settings, type NewCategory } from './schema';

/**
 * 初回起動時のカテゴリ。空の家計簿を渡されても入力を始められるようにする。
 * ユーザーは後から自由に追加・改名・アーカイブできる。
 */
const DEFAULT_CATEGORIES: Omit<NewCategory, 'id'>[] = [
  // --- 支出 ---
  { type: 'expense', name: '食費', icon: 'silverware-fork-knife', color: '#F03E3E', sortOrder: 10 },
  { type: 'expense', name: '日用品', icon: 'cart', color: '#E8590C', sortOrder: 20 },
  { type: 'expense', name: '住居', icon: 'home', color: '#F59F00', sortOrder: 30 },
  { type: 'expense', name: '水道光熱', icon: 'flash', color: '#66A80F', sortOrder: 40 },
  { type: 'expense', name: '通信', icon: 'cellphone', color: '#0CA678', sortOrder: 50 },
  { type: 'expense', name: '交通', icon: 'train', color: '#1098AD', sortOrder: 60 },
  { type: 'expense', name: '医療', icon: 'medical-bag', color: '#1C7ED6', sortOrder: 70 },
  { type: 'expense', name: '衣服・美容', icon: 'tshirt-crew', color: '#7048E8', sortOrder: 80 },
  { type: 'expense', name: '趣味・娯楽', icon: 'movie-open', color: '#AE3EC9', sortOrder: 90 },
  { type: 'expense', name: '交際費', icon: 'gift', color: '#D6336C', sortOrder: 100 },
  { type: 'expense', name: 'その他', icon: 'shape', color: '#868E96', sortOrder: 999 },
  // --- 収入 ---
  { type: 'income', name: '給与', icon: 'cash', color: '#2F9E44', sortOrder: 10 },
  { type: 'income', name: '賞与', icon: 'briefcase', color: '#0CA678', sortOrder: 20 },
  { type: 'income', name: '副業', icon: 'chart-line', color: '#1098AD', sortOrder: 30 },
  { type: 'income', name: 'その他', icon: 'bank', color: '#868E96', sortOrder: 999 },
];

const SEEDED_KEY = 'seeded_at';

/**
 * 冪等。すでに投入済みなら何もしない。
 * バックアップから復元した直後に既定カテゴリが混ざらないよう、フラグは settings に持つ。
 */
export async function seedIfNeeded(): Promise<void> {
  const [flag] = await db
    .select()
    .from(settings)
    .where(sql`${settings.key} = ${SEEDED_KEY}`)
    .limit(1);
  if (flag) return;

  const [existing] = await db
    .select({ count: sql<number>`count(*)` })
    .from(categories);

  if (!existing || existing.count === 0) {
    await db.insert(categories).values(DEFAULT_CATEGORIES);
  }

  await db
    .insert(settings)
    .values({ key: SEEDED_KEY, value: new Date().toISOString() })
    .onConflictDoNothing();
}
