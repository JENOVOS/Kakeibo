import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Avatar,
  Divider,
  FAB,
  List,
  Switch,
  Text,
  useTheme,
} from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { classify } from '@/domain/classification';
import { formatYen } from '@/domain/money';
import { formatDateMedium } from '@/domain/period';
import { describeRule } from '@/domain/recurring';
import { useDbQuery } from '@/hooks/useDbQuery';
import {
  list,
  monthlyFixedTotal,
  setActive,
  type RecurringRow,
} from '@/repositories/recurrings';
import { amountColor } from '@/theme';

/**
 * 固定費・定期収入の一覧。要件「固定費等の設定ができる」の入口。
 * 支出と収入を同じ仕組みで扱い、種別だけで表示を分ける。
 */
export default function RecurringListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { data } = useDbQuery(() => list(), []);
  const expenseTotal = useDbQuery(() => monthlyFixedTotal('expense'), []);
  const incomeTotal = useDbQuery(() => monthlyFixedTotal('income'), []);

  const rows = data ?? [];
  const expenses = rows.filter((r) => r.type === 'expense');
  const incomes = rows.filter((r) => r.type === 'income');

  const renderRow = (rule: RecurringRow, index: number) => {
    const cls = classify(rule, theme.colors.outline);
    return (
    <View key={rule.id}>
      {index > 0 ? <Divider /> : null}
      <List.Item
        title={rule.name}
        titleStyle={!rule.isActive && styles.inactive}
        description={`${describeRule(rule)} · 次回 ${formatDateMedium(
          rule.nextDueOn,
        )}${rule.autoPost ? '' : '（要確認）'}`}
        descriptionStyle={!rule.isActive && styles.inactive}
        onPress={() =>
          router.push({
            pathname: '/recurring/edit',
            params: { id: String(rule.id) },
          })
        }
        left={() => (
          <Avatar.Icon
            size={40}
            icon={cls.icon}
            color="#FFFFFF"
            style={{
              backgroundColor: cls.color,
              opacity: rule.isActive ? 1 : 0.4,
            }}
          />
        )}
        right={() => (
          <View style={styles.right}>
            <Text
              variant="bodyLarge"
              style={[
                styles.amount,
                {
                  color: rule.isActive
                    ? amountColor(rule.type, theme.dark)
                    : theme.colors.outline,
                },
              ]}
            >
              {formatYen(rule.amount)}
            </Text>
            <Switch
              value={rule.isActive}
              onValueChange={(v) => void setActive(rule.id, v)}
            />
          </View>
        )}
      />
    </View>
    );
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {rows.length === 0 ? (
          <EmptyState
            icon="autorenew"
            title="固定費がまだありません"
            description="家賃・通信費・サブスクなど、毎月決まって発生するものを登録すると、自動で家計簿に反映されます。"
            actionLabel="追加する"
            onAction={() => router.push('/recurring/edit')}
          />
        ) : (
          <>
            <AppCard>
              <View style={styles.summaryRow}>
                <View style={styles.summaryCol}>
                  <Text variant="labelMedium" style={styles.muted}>
                    固定費（月換算）
                  </Text>
                  <Text variant="titleMedium" style={styles.amount}>
                    {formatYen(expenseTotal.data ?? 0)}
                  </Text>
                </View>
                <View style={styles.summaryCol}>
                  <Text variant="labelMedium" style={styles.muted}>
                    定期収入（月換算）
                  </Text>
                  <Text variant="titleMedium" style={styles.amount}>
                    {formatYen(incomeTotal.data ?? 0)}
                  </Text>
                </View>
              </View>
            </AppCard>

            {expenses.length > 0 ? (
              <AppCard title="固定費" padded={false}>
                {expenses.map(renderRow)}
              </AppCard>
            ) : null}

            {incomes.length > 0 ? (
              <AppCard title="定期収入" padded={false}>
                {incomes.map(renderRow)}
              </AppCard>
            ) : null}

            <Text variant="bodySmall" style={styles.note}>
              年払い・週払いの項目は、月換算した概算で合計しています。
            </Text>
          </>
        )}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/recurring/edit')}
        accessibilityLabel="固定費を追加"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 12, paddingBottom: 24 },
  summaryRow: { flexDirection: 'row' },
  summaryCol: { flex: 1, alignItems: 'center' },
  right: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  amount: { fontVariant: ['tabular-nums'] },
  muted: { opacity: 0.6 },
  inactive: { opacity: 0.45 },
  note: { opacity: 0.5, paddingHorizontal: 24 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  bottomSpacer: { height: 72 },
});
