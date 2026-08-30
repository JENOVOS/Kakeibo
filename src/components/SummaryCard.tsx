import { StyleSheet, View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';
import { AppCard } from './AppCard';
import { Amount } from './Amount';
import { formatNumber } from '@/domain/money';
import { semantic, spacing } from '@/theme';
import type { PeriodSummary } from '@/repositories/transactions';

interface Props {
  summary: PeriodSummary;
  title?: string;
}

/**
 * 収入・支出・貯金・収支を1枚で見せる。
 *
 * 収支は「収入 − 支出 − 貯金」。積立に回した額を引かずに出すと、
 * まだ使えるお金を多く見積もってしまうため。
 */
export function SummaryCard({ summary, title }: Props) {
  const theme = useTheme();
  const dark = theme.dark;
  const positive = summary.balance >= 0;
  const balanceColor = positive
    ? dark
      ? semantic.incomeDark
      : semantic.income
    : dark
      ? semantic.expenseDark
      : semantic.expense;

  return (
    <AppCard>
      <View style={styles.balanceBlock}>
        <Text
          variant="labelMedium"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {title ?? '収支'}
        </Text>
        <Amount size={30} weight={800} color={balanceColor}>
          {`${summary.balance > 0 ? '+' : summary.balance < 0 ? '−' : ''}¥${formatNumber(Math.abs(summary.balance))}`}
        </Amount>
      </View>

      <View style={styles.row}>
        <Stat
          icon="arrow-down-circle"
          label="収入"
          value={summary.income}
          color={dark ? semantic.incomeDark : semantic.income}
        />
        <View
          style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]}
        />
        <Stat
          icon="arrow-up-circle"
          label="支出"
          value={summary.expense}
          color={dark ? semantic.expenseDark : semantic.expense}
        />
        {summary.savings > 0 ? (
          <>
            <View
              style={[
                styles.divider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />
            <Stat
              icon="piggy-bank"
              label="貯金"
              value={summary.savings}
              color={dark ? semantic.savingsDark : semantic.savings}
            />
          </>
        ) : null}
      </View>
    </AppCard>
  );
}

function Stat({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}) {
  const theme = useTheme();
  return (
    <View style={styles.stat}>
      <View style={styles.statLabel}>
        <Icon source={icon} size={13} color={color} />
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {label}
        </Text>
      </View>
      <Amount size={15} weight={700} color={color}>
        {`¥${formatNumber(value)}`}
      </Amount>
    </View>
  );
}

const styles = StyleSheet.create({
  balanceBlock: { alignItems: 'center', gap: 2, paddingTop: spacing.xs },
  row: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.lg },
  divider: { width: StyleSheet.hairlineWidth * 2, alignSelf: 'stretch' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statLabel: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
});
