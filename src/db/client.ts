import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import * as schema from './schema';

export const DATABASE_NAME = 'kakeibo.db';

/**
 * 端末内の SQLite が唯一の真実。サーバーは持たない。
 * enableChangeListener を有効にすると useLiveQuery が書き込みを検知して再描画する。
 */
export const sqliteDb = SQLite.openDatabaseSync(DATABASE_NAME, {
  enableChangeListener: true,
});

// 外部キー制約は SQLite では既定で無効。onDelete を効かせるため接続ごとに有効化する。
sqliteDb.execSync('PRAGMA foreign_keys = ON;');
// クラッシュ時のデータ保全と書き込み性能の両立
sqliteDb.execSync('PRAGMA journal_mode = WAL;');

export const db = drizzle(sqliteDb, { schema });

export type Db = typeof db;
