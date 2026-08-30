import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { Amount } from './Amount';
import { CategoryTile } from './CategoryTile';
import { formatNumber } from '@/domain/money';
import { progressOf } from '@/domain/savings';
import type { SavingsGoal } from '@/db/schema';
import { radius, spacing, tileRadius } from '@/theme';

interface Props {
  goals: SavingsGoal[];
  /** 目標ごとの積立済み合計（進捗表示用） */
  savedByGoal?: Map<number, number>;
  value: number | null;
  onChange: (id: number) => void;
}

/**
 * 積立先の選択。貯金では「カテゴリ」ではなく「目標」が分類の役割を持つ。
 *
 * カテゴリのグリッドと違い1行1目標にしているのは、
 * 目標には金額と進捗が付いていて、それを見てから選ぶことが多いため。
 */
export function GoalPicker({ goals, savedByGoal, value, onChange }: Props) {
  const theme = useTheme();
  const router = useRouter();

  if (goals.length === 0) {
    return (
      <TouchableRipple
        onPress={() => router.push('/savings/edit')}
        style={[
          styles.empty,
          { borderColor: theme.colors.outlineVariant },
        ]}
        borderless
      >
        <View style={styles.emptyInner}>
          <View style={[styles.addTile, { borderColor: theme.colors.outline }]}>
            <Icon source="plus" size={20} color={theme.colors.primary} />
          </View>
          <View style={styles.emptyText}>
            <Text variant="bodyMedium">貯金の目標がありません</Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              目的・目標金額・目標日を決めて作成します
            </Text>
          </View>
        </View>
      </TouchableRipple>
    );
  }

  return (
    <View style={styles.list}>
      {goals.map((goal) => {
        const selected = goal.id === value;
        const saved = savedByGoal?.get(goal.id) ?? 0;
        const progress = progressOf(saved, goal.targetAmount);
        return (
          <TouchableRipple
            key={goal.id}
            onPress={() => onChange(goal.id)}
            style={[
              styles.row,
              {
                backgroundColor: selected
                  ? theme.colors.primaryContainer
                  : theme.colors.surfaceVariant,
                borderColor: selected
                  ? theme.colors.primary
                  : theme.colors.outlineVariant,
              },
            ]}
            borderless
          >
            <View style={styles.rowInner}>
              <CategoryTile icon={goal.icon} color={goal.color} size={34} />
              <View style={styles.info}>
                <Text variant="bodyMedium" numberOfLines={1}>
                  {goal.name}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  ¥{formatNumber(saved)} / ¥{formatNumber(goal.targetAmount)}
                </Text>
              </View>
              <Amount
                size={12}
                weight={700}
                color={selected ? theme.colors.primary : theme.colors.onSurfaceVariant}
              >
                {`${Math.round(progress.ratio * 100)}%`}
              </Amount>
              {selected ? (
                <Icon source="check-circle" size={18} color={theme.colors.primary} />
              ) : null}
            </View>
          </TouchableRipple>
        );
      })}

      <TouchableRipple
        onPress={() => router.push('/savings/edit')}
        style={[styles.addRow, { borderColor: theme.colors.outlineVariant }]}
        borderless
      >
        <View style={styles.rowInner}>
          <View style={[styles.addTile, { borderColor: theme.colors.outline }]}>
            <Icon source="plus" size={20} color={theme.colors.primary} />
          </View>
          <Text
            variant="bodyMedium"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            目標を追加
          </Text>
        </View>
      </TouchableRipple>
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  row: { borderRadius: radius.md, borderWidth: 1 },
  addRow: { borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed' },
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  info: { flex: 1, gap: 2 },
  empty: { borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed' },
  emptyInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  emptyText: { flex: 1, gap: 2 },
  addTile: {
    width: 34,
    height: 34,
    borderRadius: tileRadius(34),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
