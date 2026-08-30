import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Divider,
  SegmentedButtons,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { BudgetBar } from '@/components/BudgetBar';
import {
  BudgetEditDialog,
  type BudgetTarget,
} from '@/components/BudgetEditDialog';
import { ScreenHeader } from '@/components/ScreenHeader';
import type { BudgetPeriod } from '@/db/schema';
import { formatYen } from '@/domain/money';
import { formatYearMonth, monthProgress } from '@/domain/period';
import { useDbQuery } from '@/hooks/useDbQuery';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { listByType } from '@/repositories/categories';
import {
  clear as clearBudget,
  getAmount,
  monthlyOverview,
  resolveMonthly,
  resolveYearly,
  setAmount,
  yearlyOverview,
  type BudgetKey,
} from '@/repositories/budgets';
import { monthlyFixedTotal } from '@/repositories/recurrings';
import { usePeriodStore } from '@/stores/usePeriodStore';

/**
 * 予算画面。要件「毎月/毎年の予算を設定できる」の中心。
 *
 * 毎月と毎年は同じ構造（全体 + カテゴリ別）なので、period を切り替えるだけで
 * 同じ UI を使い回している。
 */
export default function BudgetScreen() {
  const theme = useTheme();
  const bottomPadding = useTabBarPadding();
  const { yearMonth } = usePeriodStore();
  const [period, setPeriod] = useState<BudgetPeriod>('monthly');
  const [target, setTarget] = useState<BudgetTarget | null>(null);

  const isMonthly = period === 'monthly';
  const key = `${period}-${yearMonth.year}-${yearMonth.month}`;

  const overview = useDbQuery(
    () => (isMonthly ? monthlyOverview(yearMonth) : yearlyOverview(yearMonth.year)),
    [key],
  );
  const categories = useDbQuery(() => listByType('expense'), []);
  const resolved = useDbQuery(
    () => (isMonthly ? resolveMonthly(yearMonth) : resolveYearly(yearMonth.year)),
    [key],
  );
  const fixedTotal = useDbQuery(() => monthlyFixedTotal('expense'), []);

  const periodLabel = isMonthly
    ? formatYearMonth(yearMonth)
    : `${yearMonth.year}年`;
  const pace = isMonthly ? monthProgress(yearMonth) : undefined;

  /** 上書き行のキー（この年月/この年だけ） */
  const overrideKey = (categoryId: number | null): BudgetKey => ({
    period,
    year: yearMonth.year,
    month: isMonthly ? yearMonth.month : 0,
    categoryId,
  });
  /** 既定行のキー（毎月/毎年ずっと） */
  const defaultKey = (categoryId: number | null): BudgetKey => ({
    period,
    year: 0,
    month: 0,
    categoryId,
  });

  async function openEditor(categoryId: number | null, name: string) {
    const override = await getAmount(overrideKey(categoryId));
    const current = resolved.data?.get(categoryId) ?? null;
    setTarget({
      categoryId,
      name,
      period,
      currentAmount: current?.amount ?? null,
      hasOverride: override !== null,
      year: yearMonth.year,
      month: isMonthly ? yearMonth.month : 0,
      periodLabel,
    });
  }

  async function handleSubmit(amount: number, scope: 'default' | 'period') {
    if (!target) return;
    const k =
      scope === 'period'
        ? overrideKey(target.categoryId)
        : defaultKey(target.categoryId);
    await setAmount(k, amount);
    setTarget(null);
  }

  async function handleClear(scope: 'default' | 'period') {
    if (!target) return;
    if (scope === 'period') {
      await clearBudget(overrideKey(target.categoryId));
    } else {
      // 既定を消すときは、その期間の上書きも一緒に消さないと値が残って見える
      await clearBudget(defaultKey(target.categoryId));
      await clearBudget(overrideKey(target.categoryId));
    }
    setTarget(null);
  }

  const tracked = overview.data?.tracked ?? [];
  const untracked = overview.data?.untracked ?? [];
  const trackedIds = new Set(tracked.map((t) => t.categoryId));
  const unsetCategories = (categories.data ?? []).filter(
    (c) => !trackedIds.has(c.id),
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader
        showMonthNav={isMonthly}
        title={`${yearMonth.year}年の予算`}
        subtitle={isMonthly ? '毎月の予算と今月だけの上書き' : undefined}
      />

      <View style={styles.periodSwitch}>
        <SegmentedButtons
          value={period}
          onValueChange={(v) => setPeriod(v as BudgetPeriod)}
          density="medium"
          buttons={[
            { value: 'monthly', label: '毎月の予算' },
            { value: 'yearly', label: '毎年の予算' },
          ]}
        />
        {!isMonthly ? (
          <Text variant="labelMedium" style={styles.yearLabel}>
            {yearMonth.year}年（1〜12月の合計で判定）
          </Text>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
        {/* 全体予算 ------------------------------------------------- */}
        <AppCard
          title="全体予算"
          subtitle={`${periodLabel}の支出合計に対する上限`}
        >
            {overview.data?.overall ? (
              <TouchableRipple
                onPress={() => void openEditor(null, '全体')}
                borderless
                style={styles.tappable}
              >
                <View>
                  <BudgetBar
                    name={
                      overview.data.overall.isDefault
                        ? `既定（${isMonthly ? '毎月' : '毎年'}）`
                        : `${periodLabel}のみ`
                    }
                    icon="wallet"
                    budget={overview.data.overall.budget}
                    spent={overview.data.overall.spent}
                    ratio={overview.data.overall.ratio}
                    pace={pace}
                  />
                </View>
              </TouchableRipple>
            ) : (
              <View style={styles.promptRow}>
                <View style={styles.promptText}>
                  <Text variant="bodyMedium" style={styles.muted}>
                    未設定（{periodLabel}の支出 {formatYen(overview.data?.totalSpent ?? 0)}）
                  </Text>
                  {isMonthly && fixedTotal.data ? (
                    <Text variant="bodySmall" style={styles.muted}>
                      固定費だけで月 {formatYen(fixedTotal.data)} かかる見込みです
                    </Text>
                  ) : null}
                </View>
                <Button
                  mode="contained-tonal"
                  compact
                  onPress={() => void openEditor(null, '全体')}
                >
                  設定
                </Button>
              </View>
            )}
        </AppCard>

        {/* カテゴリ別予算 -------------------------------------------- */}
        <AppCard title="カテゴリ別予算" subtitle="タップして金額を設定">
            {tracked.length === 0 ? (
              <Text variant="bodyMedium" style={styles.muted}>
                まだカテゴリ別の予算はありません。下の一覧から選んで設定できます。
              </Text>
            ) : (
              tracked.map((item, index) => (
                <View key={item.categoryId}>
                  {index > 0 ? <Divider /> : null}
                  <TouchableRipple
                    onPress={() =>
                      void openEditor(item.categoryId, item.name)
                    }
                  >
                    <View>
                      <BudgetBar
                        name={
                          item.isDefault ? item.name : `${item.name}（今回のみ）`
                        }
                        icon={item.icon}
                        budget={item.budget}
                        spent={item.spent}
                        ratio={item.ratio}
                        pace={pace}
                      />
                    </View>
                  </TouchableRipple>
                </View>
              ))
            )}
        </AppCard>

        {/* 予算未設定だが支出があるカテゴリ ---------------------------- */}
        {untracked.length > 0 ? (
          <AppCard
            title="予算未設定の支出"
            subtitle={`合計 ${formatYen(
              untracked.reduce((s, u) => s + u.spent, 0),
            )}`}
          >
              {untracked.map((item) => (
                <View key={item.name} style={styles.untrackedRow}>
                  <Avatar.Icon
                    size={28}
                    icon={item.icon}
                    color="#FFFFFF"
                    style={{ backgroundColor: item.color }}
                  />
                  <Text variant="bodyMedium" style={styles.untrackedName}>
                    {item.name}
                  </Text>
                  <Text variant="bodyMedium" style={styles.amount}>
                    {formatYen(item.spent)}
                  </Text>
                </View>
              ))}
          </AppCard>
        ) : null}

        {/* 予算を追加できるカテゴリ ----------------------------------- */}
        {unsetCategories.length > 0 ? (
          <AppCard title="予算を追加する">
            <View style={styles.chips}>
              {unsetCategories.map((category) => (
                <Button
                  key={category.id}
                  mode="outlined"
                  compact
                  icon={category.icon}
                  textColor={theme.colors.onSurface}
                  onPress={() => void openEditor(category.id, category.name)}
                  style={styles.chip}
                >
                  {category.name}
                </Button>
              ))}
            </View>
          </AppCard>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <BudgetEditDialog
        target={target}
        onDismiss={() => setTarget(null)}
        onSubmit={(amount, scope) => void handleSubmit(amount, scope)}
        onClear={(scope) => void handleClear(scope)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  periodSwitch: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8, gap: 6 },
  yearLabel: { opacity: 0.6 },
  content: { paddingBottom: 24 },
  muted: { opacity: 0.7 },
  tappable: { borderRadius: 8 },
  promptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  promptText: { flex: 1 },
  untrackedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 6,
  },
  untrackedName: { flex: 1 },
  amount: { fontVariant: ['tabular-nums'] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { marginBottom: 4 },
  bottomSpacer: { height: 32 },
});
