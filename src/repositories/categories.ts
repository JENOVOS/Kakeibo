import { and, asc, eq, sql } from 'drizzle-orm';
import { db } from '@/db/client';
import {
  categories,
  transactions,
  type Category,
  type CategoryType,
} from '@/db/schema';

export async function listByType(
  type: CategoryType,
  includeArchived = false,
): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .where(
      includeArchived
        ? eq(categories.type, type)
        : and(eq(categories.type, type), eq(categories.isArchived, false)),
    )
    .orderBy(asc(categories.sortOrder), asc(categories.id));
}

export async function listAll(): Promise<Category[]> {
  return db
    .select()
    .from(categories)
    .orderBy(asc(categories.type), asc(categories.sortOrder), asc(categories.id));
}

export async function getById(id: number): Promise<Category | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1);
  return row ?? null;
}

/**
 * 入力欄では maxLength を使わない（日本語の未確定文字を壊すため）。
 * 長さの制限はここで担保する。
 */
export const NAME_MAX = 20;

function normalizeName(name: string): string {
  return name.trim().slice(0, NAME_MAX);
}

export interface CategoryInput {
  type: CategoryType;
  name: string;
  icon: string;
  color: string;
}

export async function create(input: CategoryInput): Promise<number> {
  const [max] = await db
    .select({ v: sql<number>`coalesce(max(${categories.sortOrder}), 0)` })
    .from(categories)
    .where(eq(categories.type, input.type));

  const [row] = await db
    .insert(categories)
    .values({
      ...input,
      name: normalizeName(input.name),
      sortOrder: (max?.v ?? 0) + 10,
    })
    .returning({ id: categories.id });
  return row.id;
}

export async function update(
  id: number,
  input: Omit<CategoryInput, 'type'>,
): Promise<void> {
  await db
    .update(categories)
    .set({ ...input, name: normalizeName(input.name) })
    .where(eq(categories.id, id));
}

export async function setArchived(
  id: number,
  archived: boolean,
): Promise<void> {
  await db
    .update(categories)
    .set({ isArchived: archived })
    .where(eq(categories.id, id));
}

/**
 * 実際に削除してよいのは、そのカテゴリを使う取引が1件もない場合だけ。
 * 使われている場合は履歴を壊さないためアーカイブを促す。
 */
export async function usageCount(id: number): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.categoryId, id));
  return row?.count ?? 0;
}

export async function remove(id: number): Promise<void> {
  await db.delete(categories).where(eq(categories.id, id));
}

export async function reorder(ids: number[]): Promise<void> {
  await db.transaction(async (tx) => {
    for (const [index, id] of ids.entries()) {
      await tx
        .update(categories)
        .set({ sortOrder: (index + 1) * 10 })
        .where(eq(categories.id, id));
    }
  });
}
