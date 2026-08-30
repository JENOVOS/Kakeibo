import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Divider, IconButton, Text, useTheme } from 'react-native-paper';
import { Amount } from '@/components/Amount';
import { AppCard } from '@/components/AppCard';
import { DonutChart, type Slice } from '@/components/DonutChart';
import { SummaryCard } from '@/components/SummaryCard';
import { formatNumber } from '@/domain/money';
import { currentYearMonth, yearRange } from '@/domain/period';
import { useDbQuery } from '@/hooks/useDbQuery';
import { yearlyOverview } from '@/repositories/budgets';
import { savingsTotal } from '@/repositories/transactions';
import {
  monthlyTotalsForYear,
  summaryOfYear,
  totalsByCategory,
} from '@/repositories/transactions';
import { BudgetBar } from '@/components/BudgetBar';
import { radius, semantic, spacing } from '@/theme';

const DONUT_SLICES = 7;

/**
 * 年間レポート。月ごとの棒グラフは SVG を使わず View の高さで描く。
 * 12本の縦棒に必要なのは矩形だけで、チャート依存を増やす理由がない。
 */
export default function ReportScreen() {
  const theme = useTheme();
  const [year, setYear] = useState(currentYearMonth().year);

  const summary = useDbQuery(() => summaryOfYear(year), [year]);
  const monthly = useDbQuery(() => monthlyTotalsForYear(year), [year]);
  const overview = useDbQuery(() => yearlyOverview(year), [year]);
  const breakdown = useDbQuery(() => {
    const [from, to] = yearRange(year);
    return totalsByCategory(from, to, 'expense');
  }, [year]);
  const savedThisYear = useDbQuery(() => {
    const [from, to] = yearRange(year);
    return savingsTotal(from, to);
  }, [year]);

  const months = monthly.data ?? [];
  // 貯金も出ていったお金として扱うので、支出のバーに含める
  const outflowOf = (m: { expense: number; savings: number }) =>
    m.expense + m.savings;
  const peak = Math.max(
    1,
    ...months.map((m) => Math.max(m.income, outflowOf(m))),
  );

  const categories = breakdown.data ?? [];
  const saved = savedThisYear.data ?? 0;
  const totalExpense =
    categories.reduce((sum, c) => sum + c.total, 0) + saved;
  const slices: Slice[] = categories.slice(0, DONUT_SLICES).map((c) => ({
    key: String(c.categoryId ?? 'none'),
    label: c.name,
    value: c.total,
    color: c.color,
  }));
  const rest = categories.slice(DONUT_SLICES);
  if (rest.length) {
    slices.push({
      key: 'rest',
      label: `その他 ${rest.length}件`,
      value: rest.reduce((s, c) => s + c.total, 0),
      color: theme.colors.outline,
    });
  }
  // 貯金にカテゴリは無いが、内訳の合計を全体の支出と一致させるために1枠として足す
  if (saved > 0) {
    slices.push({
      key: 'savings',
      label: '貯金',
      value: saved,
      color: semantic.savings,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <View style={styles.yearRow}>
        <IconButton icon="chevron-left" onPress={() => setYear((y) => y - 1)} />
        <Text variant="titleLarge">{year}年</Text>
        <IconButton icon="chevron-right" onPress={() => setYear((y) => y + 1)} />
      </View>

      {summary.data ? (
        <SummaryCard summary={summary.data} title={`${year}年の合計`} />
      ) : null}

      {/* 月ごとの推移 --------------------------------------------- */}
      <AppCard title="月ごとの収支">
          <View style={styles.chart}>
            {months.map((m) => (
              <View key={m.month} style={styles.chartCol}>
                <View style={styles.bars}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(m.income / peak) * 100}%`,
                        backgroundColor: theme.dark
                          ? semantic.incomeDark
                          : semantic.income,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(outflowOf(m) / peak) * 100}%`,
                        backgroundColor: theme.dark
                          ? semantic.expenseDark
                          : semantic.expense,
                      },
                    ]}
                  />
                </View>
                <Text variant="labelSmall" style={styles.chartLabel}>
                  {m.month}
                </Text>
              </View>
            ))}
          </View>
          <View style={styles.legendRow}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: theme.dark
                    ? semantic.incomeDark
                    : semantic.income,
                },
              ]}
            />
            <Text variant="labelSmall">収入</Text>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: theme.dark
                    ? semantic.expenseDark
                    : semantic.expense,
                },
              ]}
            />
            <Text variant="labelSmall">支出（貯金を含む）</Text>
          </View>
      </AppCard>

      {/* 年間予算 -------------------------------------------------- */}
      {overview.data?.overall || (overview.data?.tracked.length ?? 0) > 0 ? (
        <AppCard title="年間予算の消化">
            {overview.data?.overall ? (
              <BudgetBar
                name="全体"
                icon="wallet"
                budget={overview.data.overall.budget}
                spent={overview.data.overall.spent}
                ratio={overview.data.overall.ratio}
              />
            ) : null}
            {overview.data?.tracked.map((item, index) => (
              <View key={item.categoryId}>
                {index > 0 || overview.data?.overall ? <Divider /> : null}
                <BudgetBar
                  name={item.name}
                  icon={item.icon}
                  budget={item.budget}
                  spent={item.spent}
                  ratio={item.ratio}
                  compact
                />
              </View>
            ))}
        </AppCard>
      ) : null}

      {/* カテゴリ内訳 ---------------------------------------------- */}
      <AppCard title="支出の内訳">
          {slices.length === 0 ? (
            <Text variant="bodyMedium" style={styles.muted}>
              この年の支出はまだありません。
            </Text>
          ) : (
            <View style={styles.breakdown}>
              <DonutChart slices={slices} size={200} centerLabel="全体の支出" />
              <View style={styles.legend}>
                {slices.map((s2) => {
                  const share = totalExpense > 0 ? s2.value / totalExpense : 0;
                  return (
                    <View key={s2.key} style={styles.legendItem}>
                      <View
                        style={[styles.legendDot, { backgroundColor: s2.color }]}
                      />
                      <Text
                        variant="bodySmall"
                        style={styles.legendName}
                        numberOfLines={1}
                      >
                        {s2.label}
                      </Text>
                      <View
                        style={[
                          styles.legendTrack,
                          { backgroundColor: theme.colors.surfaceVariant },
                        ]}
                      >
                        <View
                          style={[
                            styles.legendFill,
                            {
                              width: `${share * 100}%`,
                              backgroundColor: s2.color,
                            },
                          ]}
                        />
                      </View>
                      <Amount
                        size={11.5}
                        weight={700}
                        color={theme.colors.onSurface}
                        style={styles.legendValue}
                      >
                        {`¥${formatNumber(s2.value)}`}
                      </Amount>
                    </View>
                  );
                })}
              </View>
            </View>
          )}
      </AppCard>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 24 },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  muted: { opacity: 0.7 },
  chart: { flexDirection: 'row', height: 140, alignItems: 'flex-end' },
  chartCol: { flex: 1, alignItems: 'center', height: '100%' },
  bars: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 2,
  },
  bar: { width: 6, borderTopLeftRadius: 3, borderTopRightRadius: 3, minHeight: 2 },
  chartLabel: { opacity: 0.6, marginTop: 4 },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
  },
  breakdown: { alignItems: 'center', gap: 12 },
  legend: { alignSelf: 'stretch', gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendTrack: {
    flex: 1,
    height: 6,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  legendFill: { height: '100%', borderRadius: radius.pill },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendName: { width: 62, fontSize: 11.5 },
  legendValue: { width: 72, textAlign: 'right' },
  bottomSpacer: { height: 24 },
});
