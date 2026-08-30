import { StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { Amount } from './Amount';
import { CategoryTile } from './CategoryTile';
import { classify } from '@/domain/classification';
import { formatNumber } from '@/domain/money';
import { amountColor, amountSign, spacing } from '@/theme';
import type { TransactionRow as Row } from '@/repositories/transactions';

interface Props {
  row: Row;
  onPress?: () => void;
  showDate?: boolean;
}

/**
 * 取引1件の行（モック準拠）。
 *
 * 1行目にメモ（無ければカテゴリ名）、2行目に「カテゴリ・日付」を出す。
 * 何に使ったかはメモで思い出すことが多く、カテゴリは分類の手掛かりに過ぎないため、
 * メモを主・カテゴリを従にしている。
 */
export function TransactionRow({ row, onPress, showDate }: Props) {
  const theme = useTheme();
  const { label, icon, color } = classify(row, theme.colors.outline);
  const title = row.memo || label;
  const sub = [row.memo ? label : null, showDate ? row.occurredOn : null]
    .filter(Boolean)
    .join('・');

  return (
    <TouchableRipple onPress={onPress} disabled={!onPress}>
      <View style={styles.row}>
        <CategoryTile icon={icon} color={color} size={34} />
        <View style={styles.middle}>
          <View style={styles.titleRow}>
            <Text variant="bodyMedium" numberOfLines={1} style={styles.title}>
              {title}
            </Text>
            {row.recurringId ? (
              <Icon source="autorenew" size={12} color={theme.colors.outline} />
            ) : null}
          </View>
          {sub ? (
            <Text
              variant="bodySmall"
              numberOfLines={1}
              style={[styles.sub, { color: theme.colors.onSurfaceVariant }]}
            >
              {sub}
            </Text>
          ) : null}
        </View>
        <Amount size={13.5} weight={700} color={amountColor(row.type, theme.dark)}>
          {`${amountSign(row.type)}¥${formatNumber(row.amount)}`}
        </Amount>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: spacing.lg,
    gap: 11,
  },
  middle: { flex: 1, gap: 2 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  title: { flexShrink: 1, fontSize: 12.5 },
  sub: { fontSize: 10.5 },
});
