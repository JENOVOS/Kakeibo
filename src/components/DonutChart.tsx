import { StyleSheet, View } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import Svg, { Circle, G } from 'react-native-svg';
import { formatYen } from '@/domain/money';

export interface Slice {
  key: string;
  label: string;
  value: number;
  color: string;
}

interface Props {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: number;
}

/**
 * カテゴリ内訳の円グラフ。
 *
 * チャートライブラリを足さず react-native-svg だけで描いている。
 * 必要なのは円弧1種類だけで、依存を1つ減らせるほうが
 * Expo のバージョン追従が楽になるため。
 *
 * 円は strokeDasharray で分割する（Path の円弧計算より短く、破綻しにくい）。
 */
export function DonutChart({
  slices,
  size = 180,
  thickness = 22,
  centerLabel = '合計',
  centerValue,
}: Props) {
  const theme = useTheme();
  const total = slices.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let offset = 0;
  const arcs = slices
    .filter((s) => s.value > 0)
    .map((s) => {
      const fraction = total > 0 ? s.value / total : 0;
      const length = fraction * circumference;
      const arc = {
        ...s,
        length,
        offset,
      };
      offset += length;
      return arc;
    });

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        {/* 12時方向を起点にするため -90度回す */}
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={theme.colors.surfaceVariant}
            strokeWidth={thickness}
            fill="none"
          />
          {arcs.map((arc) => (
            <Circle
              key={arc.key}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={arc.color}
              strokeWidth={thickness}
              fill="none"
              strokeDasharray={`${arc.length} ${circumference - arc.length}`}
              strokeDashoffset={-arc.offset}
              strokeLinecap="butt"
            />
          ))}
        </G>
      </Svg>

      <View style={styles.center} pointerEvents="none">
        <Text variant="labelSmall" style={styles.centerLabel}>
          {centerLabel}
        </Text>
        <Text variant="titleMedium" style={styles.centerValue}>
          {formatYen(centerValue ?? total)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  center: { position: 'absolute', alignItems: 'center' },
  centerLabel: { opacity: 0.6 },
  centerValue: { fontVariant: ['tabular-nums'] },
});
