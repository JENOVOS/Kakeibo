import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Svg, { Circle, G } from 'react-native-svg';
import { Amount } from './Amount';
import { formatNumber } from '@/domain/money';
import { monthsToReach, type Outlook } from '@/domain/savings';
import { formatYearMonth, shiftMonth, currentYearMonth } from '@/domain/period';
import type { GoalRow } from '@/repositories/savings';
import { spacing } from '@/theme';

const OUTLOOK_TEXT: Record<Outlook, string> = {
  achieved: '目標を達成しました',
  onTrack: 'この調子なら間に合います',
  behind: 'このペースでは目標日に届きません',
  unknown: '',
};

interface Props {
  goal: GoalRow;
}

/**
 * 貯金目標1件の進捗（モックの「貯金目標」カード準拠）。
 * 左にリング、右に金額と見通し。
 */
export function GoalCard({ goal }: Props) {
  const theme = useTheme();
  const size = 88;
  const thickness = 9;
  const radiusPx = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radiusPx;
  const shown = Math.min(goal.ratio, 1);

  const monthsElapsed = goal.startedOn ? 1 : 0;
  const need = monthsToReach(goal.saved, goal.target, Math.max(1, monthsElapsed));
  const eta =
    need !== null && need > 0
      ? formatYearMonth(shiftMonth(currentYearMonth(), need))
      : null;

  const outlookText = OUTLOOK_TEXT[goal.outlook];
  const outlookColor =
    goal.outlook === 'behind' ? theme.colors.error : theme.colors.primary;

  return (
    <View style={styles.row}>
      <View style={[styles.ring, { width: size, height: size }]}>
        <Svg width={size} height={size}>
          <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radiusPx}
              stroke={theme.colors.surfaceVariant}
              strokeWidth={thickness}
              fill="none"
            />
            <Circle
              cx={size / 2}
              cy={size / 2}
              r={radiusPx}
              stroke={goal.color}
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={`${shown * circumference} ${circumference}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={styles.ringCenter} pointerEvents="none">
          <Amount size={19} weight={800} color={theme.colors.onSurface}>
            {`${Math.round(goal.ratio * 100)}%`}
          </Amount>
          <Text
            variant="labelSmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            達成
          </Text>
        </View>
      </View>

      <View style={styles.info}>
        <Text variant="bodyMedium" numberOfLines={1} style={styles.name}>
          {goal.name}
        </Text>
        <Amount size={20} weight={800} color={theme.colors.onSurface}>
          {`¥${formatNumber(goal.saved)}`}
        </Amount>
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          目標 ¥{formatNumber(goal.target)}・
          {goal.achieved
            ? '達成済み'
            : `あと ¥${formatNumber(goal.remaining)}`}
        </Text>
        {goal.targetDate ? (
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onSurfaceVariant }}
          >
            目標日 {goal.targetDate}
            {goal.requiredMonthly !== null
              ? `・月 ¥${formatNumber(goal.requiredMonthly)} 必要`
              : ''}
          </Text>
        ) : null}
        {outlookText ? (
          <Text variant="bodySmall" style={{ color: outlookColor }}>
            {outlookText}
            {goal.outlook !== 'achieved' && eta ? `（${eta} 到達見込み）` : ''}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  ring: { alignItems: 'center', justifyContent: 'center' },
  ringCenter: { position: 'absolute', alignItems: 'center' },
  info: { flex: 1, gap: 3 },
  name: { fontWeight: '700' },
});
