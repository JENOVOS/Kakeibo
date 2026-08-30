import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Divider, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { Amount } from '@/components/Amount';
import { AdBanner } from '@/components/AdBanner';
import { AppCard } from '@/components/AppCard';
import { BudgetBar } from '@/components/BudgetBar';
import { CategoryTile } from '@/components/CategoryTile';
import { DonutChart, type Slice } from '@/components/DonutChart';
import { EmptyState } from '@/components/EmptyState';
import { GoalCard } from '@/components/GoalCard';
import { HomeHeader } from '@/components/HomeHeader';
import { SummaryCard } from '@/components/SummaryCard';
import { TransactionRow } from '@/components/TransactionRow';
import { formatNumber } from '@/domain/money';
import { formatMonthDay, monthProgress, shiftMonth } from '@/domain/period';
import { useDbQuery } from '@/hooks/useDbQuery';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import { useEntitlement } from '@/stores/useEntitlement';
import { monthlyOverview } from '@/repositories/budgets';
import { list as listGoals } from '@/repositories/savings';
import {
  confirmOccurrence,
  listPendingConfirmations,
  skipOccurrence,
  upcoming,
} from '@/repositories/recurrings';
import {
  listByMonth,
  summaryOfMonth,
  totalsByCategoryForMonth,
} from '@/repositories/transactions';
import { usePeriodStore } from '@/stores/usePeriodStore';
import { radius, semantic, spacing } from '@/theme';

/** 上位いくつまで円グラフで色分けし、残りを「その他」にまとめるか */
const DONUT_SLICES = 6;
/** ホームに出すカテゴリ別予算の件数（消化率の高い順） */
const BUDGET_ROWS = 4;

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const bottomPadding = useTabBarPadding();
  const isPro = useEntitlement((s) => s.isPro);
  const { yearMonth } = usePeriodStore();
  const key = `${yearMonth.year}-${yearMonth.month}`;

  const summary = useDbQuery(() => summaryOfMonth(yearMonth), [key]);
  const prevSummary = useDbQuery(
    () => summaryOfMonth(shiftMonth(yearMonth, -1)),
    [key],
  );
  const overview = useDbQuery(() => monthlyOverview(yearMonth), [key]);
  const breakdown = useDbQuery(
    () => totalsByCategoryForMonth(yearMonth, 'expense'),
    [key],
  );
  const recent = useDbQuery(() => listByMonth(yearMonth), [key]);
  const soon = useDbQuery(() => upcoming(14), []);
  const pending = useDbQuery(() => listPendingConfirmations(), []);
  const goals = useDbQuery(() => listGoals(), []);

  const pace = monthProgress(yearMonth);
  // 貯金も出ていったお金として数える（→ HomeHeader / PeriodSummary）
  const outflow = summary.data?.outflow ?? 0;
  const savings = summary.data?.savings ?? 0;
  const prevOutflow = prevSummary.data?.outflow ?? 0;
  const delta = prevOutflow > 0 ? (outflow - prevOutflow) / prevOutflow : null;
  const categoryTotals = breakdown.data ?? [];

  const slices: Slice[] = categoryTotals.slice(0, DONUT_SLICES).map((c) => ({
    key: String(c.categoryId ?? 'none'),
    label: c.name,
    value: c.total,
    color: c.color,
  }));
  const rest = categoryTotals.slice(DONUT_SLICES);
  if (rest.length) {
    slices.push({
      key: 'rest',
      label: `その他 ${rest.length}件`,
      value: rest.reduce((sum, c) => sum + c.total, 0),
      color: theme.colors.outline,
    });
  }
  // 貯金にカテゴリは無いが、内訳の合計を「全体の支出」と一致させるために1枠として足す
  if (savings > 0) {
    slices.push({
      key: 'savings',
      label: '貯金',
      value: savings,
      color: semantic.savings,
    });
  }

  const tracked = (overview.data?.tracked ?? []).slice(0, BUDGET_ROWS);
  const linkStyle = { color: theme.colors.primary };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>
        <HomeHeader
          spent={outflow}
          savings={savings}
          budget={overview.data?.overall?.budget ?? null}
          delta={delta}
        />

        <View style={styles.stack}>
          {/* 確認待ちの固定費 ------------------------------------- */}
          {pending.data && pending.data.length > 0 ? (
            <AppCard
              title="確認待ちの固定費"
              subtitle="金額を確かめてから記録します"
            >
              {pending.data.map((rule, index) => (
                <View key={rule.id}>
                  {index > 0 ? <Divider style={styles.innerDivider} /> : null}
                  <View style={styles.pendingRow}>
                    <CategoryTile
                      icon={rule.categoryIcon ?? 'autorenew'}
                      color={rule.categoryColor ?? theme.colors.outline}
                      size={32}
                    />
                    <View style={styles.pendingInfo}>
                      <Text variant="bodyMedium">{rule.name}</Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {formatMonthDay(rule.nextDueOn)}・¥
                        {formatNumber(rule.amount)}
                      </Text>
                    </View>
                    <TouchableRipple
                      onPress={() => void skipOccurrence(rule.id)}
                      style={styles.ghostButton}
                      borderless
                    >
                      <Text
                        variant="labelMedium"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        今回なし
                      </Text>
                    </TouchableRipple>
                    <TouchableRipple
                      onPress={() =>
                        void confirmOccurrence(rule.id, rule.nextDueOn)
                      }
                      style={[
                        styles.solidButton,
                        { backgroundColor: theme.colors.primary },
                      ]}
                      borderless
                    >
                      <Text variant="labelMedium" style={styles.solidLabel}>
                        確定
                      </Text>
                    </TouchableRipple>
                  </View>
                </View>
              ))}
            </AppCard>
          ) : null}

          {/* カテゴリ別の予算 -------------------------------------- */}
          <AppCard
            title="カテゴリ別の予算"
            action={
              <TouchableRipple onPress={() => router.push('/budget')} borderless>
                <Text variant="labelMedium" style={linkStyle}>
                  予算 ›
                </Text>
              </TouchableRipple>
            }
          >
            {tracked.length > 0 ? (
              tracked.map((item) => (
                <BudgetBar
                  key={item.categoryId}
                  name={item.name}
                  icon={item.icon}
                  color={item.color}
                  budget={item.budget}
                  spent={item.spent}
                  ratio={item.ratio}
                  pace={pace}
                />
              ))
            ) : (
              <View style={styles.promptRow}>
                <Icon
                  source="wallet-outline"
                  size={20}
                  color={theme.colors.primary}
                />
                <Text
                  variant="bodySmall"
                  style={[
                    styles.promptText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  カテゴリ別の予算はまだ設定されていません
                </Text>
                <TouchableRipple
                  onPress={() => router.push('/budget')}
                  borderless
                >
                  <Text variant="labelMedium" style={linkStyle}>
                    設定 ›
                  </Text>
                </TouchableRipple>
              </View>
            )}
          </AppCard>

          {/* 収支 ------------------------------------------------- */}
          {summary.data ? <SummaryCard summary={summary.data} /> : null}

          {/* 貯金の目標 ------------------------------------------- */}
          {isPro && goals.data && goals.data.length > 0 ? (
            <AppCard
              title="貯金の目標"
              action={
                <TouchableRipple
                  onPress={() => router.push('/savings')}
                  borderless
                >
                  <Text variant="labelMedium" style={linkStyle}>
                    一覧 ›
                  </Text>
                </TouchableRipple>
              }
            >
              {goals.data.slice(0, 2).map((goal, index) => (
                <View key={goal.id}>
                  {index > 0 ? <Divider style={styles.goalDivider} /> : null}
                  <TouchableRipple
                    onPress={() =>
                      router.push({
                        pathname: '/savings/edit',
                        params: { id: String(goal.id) },
                      })
                    }
                  >
                    <View style={styles.goalWrap}>
                      <GoalCard goal={goal} />
                    </View>
                  </TouchableRipple>
                </View>
              ))}
            </AppCard>
          ) : null}

          {/* 支出の内訳 ------------------------------------------- */}
          <AppCard
            title="支出の内訳"
            action={
              <TouchableRipple onPress={() => router.push('/report')} borderless>
                <Text variant="labelMedium" style={linkStyle}>
                  レポート ›
                </Text>
              </TouchableRipple>
            }
          >
            {slices.length === 0 ? (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                この月の支出はまだありません。
              </Text>
            ) : (
              <View style={styles.breakdown}>
                <DonutChart slices={slices} centerLabel="全体の支出" />
                <View style={styles.legend}>
                  {slices.map((s) => (
                    <View key={s.key} style={styles.legendRow}>
                      <View
                        style={[styles.legendDot, { backgroundColor: s.color }]}
                      />
                      <Text
                        variant="bodySmall"
                        style={styles.legendName}
                        numberOfLines={1}
                      >
                        {s.label}
                      </Text>
                      <Amount size={11.5} weight={700} color={theme.colors.onSurface}>
                        {`¥${formatNumber(s.value)}`}
                      </Amount>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </AppCard>

          {/* まもなく発生する固定費 -------------------------------- */}
          {soon.data && soon.data.length > 0 ? (
            <AppCard
              title="まもなく発生する固定費"
              action={
                <TouchableRipple
                  onPress={() => router.push('/recurring')}
                  borderless
                >
                  <Text variant="labelMedium" style={linkStyle}>
                    一覧 ›
                  </Text>
                </TouchableRipple>
              }
            >
              {soon.data.slice(0, 4).map((rule, index) => (
                <View key={rule.id}>
                  {index > 0 ? <Divider style={styles.innerDivider} /> : null}
                  <View style={styles.ruleRow}>
                    <CategoryTile
                      icon={rule.categoryIcon ?? 'autorenew'}
                      color={rule.categoryColor ?? theme.colors.outline}
                      size={32}
                    />
                    <View style={styles.ruleInfo}>
                      <Text variant="bodyMedium" numberOfLines={1}>
                        {rule.name}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={{ color: theme.colors.onSurfaceVariant }}
                      >
                        {formatMonthDay(rule.nextDueOn)}・
                        {rule.autoPost ? '自動計上' : '要確認'}
                      </Text>
                    </View>
                    <Amount size={13} weight={700} color={theme.colors.onSurface}>
                      {`¥${formatNumber(rule.amount)}`}
                    </Amount>
                  </View>
                </View>
              ))}
            </AppCard>
          ) : null}

          {/* 最近の記録 ------------------------------------------- */}
          <AppCard
            title="最近の記録"
            action={
              <TouchableRipple onPress={() => router.push('/history')} borderless>
                <Text variant="labelMedium" style={linkStyle}>
                  すべて見る ›
                </Text>
              </TouchableRipple>
            }
            padded={false}
          >
            {recent.data && recent.data.length > 0 ? (
              recent.data.slice(0, 5).map((row, index) => (
                <View key={row.id}>
                  {index > 0 ? <Divider style={styles.rowDivider} /> : null}
                  <TransactionRow
                    row={row}
                    showDate
                    onPress={() =>
                      router.push({
                        pathname: '/entry',
                        params: { id: String(row.id) },
                      })
                    }
                  />
                </View>
              ))
            ) : (
              <EmptyState
                icon="pencil-plus-outline"
                title="まだ記録がありません"
                description="下の ＋ から支出・収入を追加できます。"
              />
            )}
          </AppCard>

          <AdBanner />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  stack: { paddingTop: 18 },
  innerDivider: { marginVertical: 2 },
  rowDivider: { marginLeft: 61 },
  goalDivider: { marginVertical: spacing.md },
  goalWrap: { paddingVertical: spacing.xs },
  promptRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  promptText: { flex: 1 },
  breakdown: { alignItems: 'center', gap: spacing.lg },
  legend: { alignSelf: 'stretch', gap: 9 },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDot: { width: 9, height: 9, borderRadius: 3 },
  legendName: { flex: 1, fontSize: 11.5 },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 9,
  },
  ruleInfo: { flex: 1, gap: 2 },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 9,
  },
  pendingInfo: { flex: 1, gap: 2 },
  ghostButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.md },
  solidButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
  },
  solidLabel: { color: '#FFFFFF' },
});
