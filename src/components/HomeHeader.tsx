import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { IconButton, Text, TouchableRipple } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Amount } from './Amount';
import { formatNumber, formatPercent } from '@/domain/money';
import { currentYearMonth, formatYearMonth } from '@/domain/period';
import { usePeriodStore } from '@/stores/usePeriodStore';
import { headerGradient, radius, spacing } from '@/theme';

interface Props {
  /** 支出 + 貯金。手元から出ていった総額 */
  spent: number;
  /** 内訳の下段に出す積立額。0 なら出さない */
  savings: number;
  /** 予算未設定なら null。バーと残額は出さない */
  budget: number | null;
  /** 前月比（0.12 = +12%）。前月の実績が無ければ null */
  delta: number | null;
}

/**
 * ホーム最上部の見出し。モックの中心的な要素。
 *
 * 「今月いくら出ていったか」だけを大きく出し、予算バー・残額・前月比を
 * 従える構成。家計簿を開く動機のほとんどがこの一問なので、
 * スクロールせずに答えが見える位置に置いている。
 *
 * 金額は支出と貯金の合計。積立も手元から出ていくお金として扱うため、
 * 見出しは「今月の支出」ではなく「全体の支出」としている。
 */
export function HomeHeader({ spent, savings, budget, delta }: Props) {
  const insets = useSafeAreaInsets();
  const { yearMonth, next, prev, reset } = usePeriodStore();
  const now = currentYearMonth();
  const isCurrent =
    yearMonth.year === now.year && yearMonth.month === now.month;

  const ratio = budget && budget > 0 ? spent / budget : 0;
  // 超過したぶんも隠さず出す。残り0で止めると「あとどれだけ出過ぎているか」が分からない
  const diff = budget === null ? 0 : budget - spent;
  const over = diff < 0;

  return (
    <LinearGradient
      colors={[headerGradient[0], headerGradient[1]]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      style={[styles.root, { paddingTop: insets.top + spacing.md }]}
    >
      <View style={styles.topRow}>
        <View style={styles.monthNav}>
          <IconButton
            icon="chevron-left"
            size={18}
            iconColor="#FFFFFF"
            containerColor="rgba(255,255,255,.16)"
            style={styles.navButton}
            onPress={prev}
            accessibilityLabel="前の月"
          />
          <Text variant="titleSmall" style={styles.monthLabel}>
            {formatYearMonth(yearMonth)}
          </Text>
          <IconButton
            icon="chevron-right"
            size={18}
            iconColor="#FFFFFF"
            containerColor="rgba(255,255,255,.16)"
            style={styles.navButton}
            onPress={next}
            accessibilityLabel="次の月"
          />
        </View>

        {!isCurrent ? (
          <TouchableRipple onPress={reset} style={styles.badge} borderless>
            <Text variant="labelSmall" style={styles.badgeText}>
              今月に戻る
            </Text>
          </TouchableRipple>
        ) : null}
      </View>

      <Text variant="labelMedium" style={styles.caption}>
        全体の支出
      </Text>
      <View style={styles.amountRow}>
        <Amount size={40} weight={800} color="#FFFFFF" style={styles.hero}>
          {`¥${formatNumber(spent)}`}
        </Amount>
        {delta !== null ? (
          <Text variant="labelMedium" style={styles.delta}>
            前月比 {delta >= 0 ? '+' : '−'}
            {formatPercent(Math.abs(delta))}
          </Text>
        ) : null}
      </View>

      {savings > 0 ? (
        <Text variant="labelSmall" style={styles.breakdown}>
          うち貯金 ¥{formatNumber(savings)}
        </Text>
      ) : null}

      {budget !== null && budget > 0 ? (
        <>
          <View style={styles.track}>
            <View
              style={[styles.fill, { width: `${Math.min(ratio, 1) * 100}%` }]}
            />
          </View>
          <View style={styles.footRow}>
            <Text variant="labelMedium" style={styles.foot}>
              予算 ¥{formatNumber(budget)}・{formatPercent(ratio)}
            </Text>
            <Text
              variant="labelMedium"
              style={[styles.foot, over && styles.footOver]}
            >
              {over
                ? `¥${formatNumber(-diff)} 超過`
                : `残り ¥${formatNumber(diff)}`}
            </Text>
          </View>
        </>
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { paddingHorizontal: 20, paddingBottom: 20 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    minHeight: 30,
  },
  monthNav: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  navButton: { margin: 0, borderRadius: 9, width: 26, height: 26 },
  monthLabel: { color: '#FFFFFF', fontWeight: '700' },
  badge: {
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,.16)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { color: '#FFFFFF' },
  caption: { color: 'rgba(255,255,255,.85)', marginBottom: 2 },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  hero: { letterSpacing: -0.8 },
  delta: { color: 'rgba(255,255,255,.9)', paddingBottom: 5 },
  breakdown: { color: 'rgba(255,255,255,.8)', marginTop: 4 },
  track: {
    marginTop: spacing.lg,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,.22)',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: '#FFFFFF' },
  footRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginTop: 9,
  },
  foot: { color: 'rgba(255,255,255,.92)' },
  /** 超過は白のままだと予算内と見分けが付かないので、濃く出す */
  footOver: { color: '#FFE2D8', fontWeight: '700' },
});
