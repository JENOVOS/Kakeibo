import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { Amount } from './Amount';
import { CategoryTile } from './CategoryTile';
import { formatNumber, formatPercent } from '@/domain/money';
import { budgetColor, radius, spacing } from '@/theme';

interface Props {
  name: string;
  icon?: string;
  /** タイルの色。カテゴリ別ならそのカテゴリ色 */
  color?: string;
  budget: number;
  spent: number;
  ratio: number;
  /** 期間の経過割合。バーがこれより先にあれば使うペースが速い */
  pace?: number;
  compact?: boolean;
}

/**
 * 予算の消化バー（モックの「カテゴリ別の予算」行に準拠）。
 *
 * 上段に タイル・名前・金額・％、下段に細いバー。
 * 超過を色だけで伝えないよう、残額と％は必ず文字でも出す。
 */
export function BudgetBar({
  name,
  icon,
  color,
  budget,
  spent,
  ratio,
  pace,
  compact,
}: Props) {
  const theme = useTheme();
  const barColor = budgetColor(ratio, theme.dark);
  const tileColor = color ?? theme.colors.primary;
  const over = spent - budget;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.header}>
        {icon ? <CategoryTile icon={icon} color={tileColor} size={22} /> : null}
        <Text variant="bodySmall" style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Amount size={12} weight={700} color={theme.colors.onSurface}>
          {`¥${formatNumber(spent)}`}
        </Amount>
        <Amount
          size={10.5}
          weight={500}
          color={barColor}
          style={styles.percent}
        >
          {formatPercent(ratio)}
        </Amount>
      </View>

      <View
        style={[styles.track, { backgroundColor: theme.colors.surfaceVariant }]}
      >
        <View
          style={[
            styles.fill,
            { width: `${Math.min(ratio, 1) * 100}%`, backgroundColor: barColor },
          ]}
        />
        {pace !== undefined && pace > 0 && pace < 1 ? (
          <View
            style={[
              styles.paceMark,
              { left: `${pace * 100}%`, backgroundColor: theme.colors.onSurface },
            ]}
          />
        ) : null}
      </View>

      <View style={styles.footer}>
        <Text
          variant="bodySmall"
          style={[styles.foot, { color: theme.colors.onSurfaceVariant }]}
        >
          予算 ¥{formatNumber(budget)}
        </Text>
        <Text variant="bodySmall" style={[styles.foot, { color: barColor }]}>
          {over > 0
            ? `¥${formatNumber(over)} 超過`
            : `残り ¥${formatNumber(-over)}`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 7 },
  wrapCompact: { paddingVertical: 5 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 6,
  },
  name: { flex: 1, fontSize: 11.5 },
  percent: { width: 40, textAlign: 'right' },
  track: {
    height: 5,
    borderRadius: radius.pill,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  paceMark: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    opacity: 0.35,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  foot: { fontSize: 10.5 },
});
