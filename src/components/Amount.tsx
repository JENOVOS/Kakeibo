import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';
import { font, tabular } from '@/theme';

interface Props {
  children: string;
  size?: number;
  /** 800 = 見出しの金額 / 700 = 一覧の金額 / 600 = 補助 */
  weight?: 800 | 700 | 600 | 500;
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

const FAMILY: Record<NonNullable<Props['weight']>, string> = {
  800: font.numeric,
  700: font.numericBold,
  600: font.numericSemi,
  500: font.numericMedium,
};

/**
 * 金額・数値の表示。
 *
 * 数字だけ Manrope（等幅数字）で描く。桁が揃わないと一覧の金額が読みにくく、
 * 家計簿では「並べて比べる」操作が中心になるため、ここは書体を固定する。
 * Paper の Text ではなく素の Text を使うのは、fontFamily を確実に効かせるため。
 */
export function Amount({
  children,
  size = 13,
  weight = 700,
  color,
  style,
  numberOfLines,
}: Props) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        styles.base,
        { fontFamily: FAMILY[weight], fontSize: size, color },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: { ...tabular },
});
