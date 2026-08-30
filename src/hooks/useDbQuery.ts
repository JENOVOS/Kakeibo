import { useCallback, useEffect, useRef, useState } from 'react';
import { addDatabaseChangeListener } from 'expo-sqlite';

/**
 * DB を読むだけの非同期関数を、書き込みのたびに自動で再実行するフック。
 *
 * expo-sqlite の変更通知（openDatabaseSync の enableChangeListener）を購読しているので、
 * 画面側は「保存したら再読込する」を書かなくてよい。
 * サーバーがない構成なので TanStack Query のようなキャッシュ層は不要で、
 * 都度クエリし直すほうが状態のズレが起きない。
 */
export function useDbQuery<T>(
  query: () => Promise<T>,
  deps: readonly unknown[] = [],
): { data: T | null; loading: boolean; error: Error | null; refresh: () => void } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // 最新の query を参照しつつ、deps だけで再購読を制御する
  const queryRef = useRef(query);
  queryRef.current = query;

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const run = useCallback(async () => {
    try {
      const result = await queryRef.current();
      if (!mountedRef.current) return;
      setData(result);
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    // 1回の保存で複数テーブルが動くことがあるため、まとめて1回だけ再実行する
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sub = addDatabaseChangeListener(() => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void run(), 60);
    });
    return () => {
      if (timer) clearTimeout(timer);
      sub.remove();
    };
  }, [run]);

  return { data, loading, error, refresh: run };
}
