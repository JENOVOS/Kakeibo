import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Divider, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { Amount } from '@/components/Amount';
import { AdBanner } from '@/components/AdBanner';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { ScreenHeader } from '@/components/ScreenHeader';
import { TransactionRow } from '@/components/TransactionRow';
import type { EntryType } from '@/db/schema';
import { formatNumber } from '@/domain/money';
import { formatDateMedium } from '@/domain/period';
import { useDbQuery } from '@/hooks/useDbQuery';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import {
  listByMonth,
  type TransactionRow as Row,
} from '@/repositories/transactions';
import { usePeriodStore } from '@/stores/usePeriodStore';
import { radius, spacing } from '@/theme';

type Filter = 'all' | EntryType;

interface Group {
  date: string;
  title: string;
  /** その日の収支（収入 − 支出）。日単位の増減を一目で見せる */
  net: number;
  rows: Row[];
}

/** 日付ごとにまとめ、見出しに日計を出す */
function groupByDate(rows: Row[]): Group[] {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const list = map.get(row.occurredOn);
    if (list) list.push(row);
    else map.set(row.occurredOn, [row]);
  }
  return [...map.entries()].map(([date, list]) => ({
    date,
    title: formatDateMedium(date),
    net: list.reduce(
      (sum, r) => sum + (r.type === 'income' ? r.amount : -r.amount),
      0,
    ),
    rows: list,
  }));
}

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'すべて' },
  { value: 'expense', label: '支出' },
  { value: 'income', label: '収入' },
];

/** 日付ごとのカードを積む形（モックの histGroups 準拠） */
export default function HistoryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const bottomPadding = useTabBarPadding();
  const { yearMonth } = usePeriodStore();
  const [filter, setFilter] = useState<Filter>('all');

  const key = `${yearMonth.year}-${yearMonth.month}-${filter}`;
  const { data } = useDbQuery(
    () => listByMonth(yearMonth, filter === 'all' ? undefined : filter),
    [key],
  );

  const groups = useMemo(() => groupByDate(data ?? []), [data]);
  const rows = data ?? [];
  const total = rows.reduce(
    (sum, r) => sum + (r.type === 'income' ? r.amount : -r.amount),
    0,
  );

  const signed = (n: number) =>
    `${n > 0 ? '+' : n < 0 ? '−' : ''}¥${formatNumber(Math.abs(n))}`;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader subtitle="記録の絞り込み" />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
        <View style={styles.chips}>
          {FILTERS.map((f) => {
            const active = filter === f.value;
            return (
              <TouchableRipple
                key={f.value}
                onPress={() => setFilter(f.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active
                      ? theme.colors.primary
                      : theme.colors.surface,
                    borderColor: active
                      ? theme.colors.primary
                      : theme.colors.outlineVariant,
                  },
                ]}
                borderless
              >
                <Text
                  variant="labelMedium"
                  style={{
                    color: active ? '#FFFFFF' : theme.colors.onSurfaceVariant,
                  }}
                >
                  {f.label}
                </Text>
              </TouchableRipple>
            );
          })}
        </View>

        <View style={styles.countRow}>
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {rows.length}件
          </Text>
          <Amount size={12} weight={700} color={theme.colors.onSurface}>
            {signed(total)}
          </Amount>
        </View>

        {groups.length === 0 ? (
          <AppCard>
            <EmptyState
              icon="calendar-blank-outline"
              title="この月の記録はありません"
              description="月を切り替えるか、下の ＋ から記録を追加してください。"
            />
          </AppCard>
        ) : (
          groups.map((group) => (
            <AppCard key={group.date} padded={false} style={styles.groupCard}>
              <View style={styles.groupHeader}>
                <Text variant="labelLarge" style={styles.groupTitle}>
                  {group.title}
                </Text>
                <Amount
                  size={11}
                  weight={600}
                  color={theme.colors.onSurfaceVariant}
                >
                  {signed(group.net)}
                </Amount>
              </View>
              {group.rows.map((row, index) => (
                <View key={row.id}>
                  {index > 0 ? <Divider style={styles.rowDivider} /> : null}
                  <TransactionRow
                    row={row}
                    onPress={() =>
                      router.push({
                        pathname: '/entry',
                        params: { id: String(row.id) },
                      })
                    }
                  />
                </View>
              ))}
            </AppCard>
          ))
        )}

        <AdBanner />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  chips: {
    flexDirection: 'row',
    gap: 7,
    paddingHorizontal: spacing.lg,
    paddingBottom: 11,
  },
  chip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 11,
  },
  groupCard: { borderRadius: radius.group },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 6,
  },
  groupTitle: { fontSize: 11.5, fontWeight: '700' },
  rowDivider: { marginLeft: 61 },
});
