import { StyleSheet, View } from 'react-native';
import { IconButton, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cardShadow, radius, spacing } from '@/theme';
import { currentYearMonth, formatYearMonth } from '@/domain/period';
import { usePeriodStore } from '@/stores/usePeriodStore';

interface Props {
  /** 見出し下の補足（「記録の検索と絞り込み」など） */
  subtitle?: string;
  /** 年月ナビを出すか。設定画面のように月に依らない画面では false */
  showMonthNav?: boolean;
  /** 年月ナビを出さないときの表題 */
  title?: string;
}

/**
 * ホーム以外の画面の上部バー（モックの showTopBar 準拠）。
 * 白面・下に境界線、中央に年月と補足、左右に月送り。
 */
export function ScreenHeader({ subtitle, showMonthNav = true, title }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { yearMonth, next, prev, reset } = usePeriodStore();
  const now = currentYearMonth();
  const isCurrent =
    yearMonth.year === now.year && yearMonth.month === now.month;

  return (
    <View
      style={[
        styles.root,
        cardShadow,
        {
          paddingTop: insets.top + spacing.sm,
          backgroundColor: theme.colors.surface,
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
    >
      {showMonthNav ? (
        <IconButton
          icon="chevron-left"
          size={18}
          iconColor={theme.colors.onSurfaceVariant}
          containerColor={theme.colors.surfaceVariant}
          style={styles.navButton}
          onPress={prev}
          accessibilityLabel="前の月"
        />
      ) : (
        <View style={styles.navSpacer} />
      )}

      <TouchableRipple
        onPress={reset}
        disabled={!showMonthNav || isCurrent}
        style={styles.center}
        borderless
      >
        <View style={styles.centerInner}>
          <Text variant="titleSmall" style={styles.title}>
            {showMonthNav ? formatYearMonth(yearMonth) : (title ?? '')}
          </Text>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            {showMonthNav && !isCurrent ? 'タップで今月に戻る' : subtitle}
          </Text>
        </View>
      </TouchableRipple>

      {showMonthNav ? (
        <IconButton
          icon="chevron-right"
          size={18}
          iconColor={theme.colors.onSurfaceVariant}
          containerColor={theme.colors.surfaceVariant}
          style={styles.navButton}
          onPress={next}
          accessibilityLabel="次の月"
        />
      ) : (
        <View style={styles.navSpacer} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth * 2,
  },
  navButton: { margin: 0, width: 30, height: 30, borderRadius: radius.md },
  navSpacer: { width: 30 },
  center: { flex: 1, borderRadius: radius.md, paddingVertical: 2 },
  centerInner: { alignItems: 'center', gap: 1 },
  title: { fontWeight: '700' },
});
