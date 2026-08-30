import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Icon } from 'react-native-paper';
import { tileRadius } from '@/theme';

interface Props {
  icon: string;
  color: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
  /** 無効・アーカイブ済みを薄く見せる */
  dimmed?: boolean;
}

/**
 * カテゴリのアイコンタイル。
 *
 * モックでは円ではなく「角丸の正方形」で、角丸は辺の約1/3。
 * 一覧に並んだときに矩形のリズムが揃い、金額の右揃えと相性が良い。
 */
export function CategoryTile({ icon, color, size = 34, style, dimmed }: Props) {
  return (
    <View
      style={[
        styles.tile,
        {
          width: size,
          height: size,
          borderRadius: tileRadius(size),
          backgroundColor: color,
          opacity: dimmed ? 0.4 : 1,
        },
        style,
      ]}
    >
      <Icon source={icon} size={Math.round(size * 0.55)} color="#FFFFFF" />
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', justifyContent: 'center' },
});
