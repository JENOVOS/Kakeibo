import { ScrollView, StyleSheet, View } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { CategoryTile } from './CategoryTile';
import { ICON_GROUPS, radius, spacing } from '@/theme';

interface Props {
  value: string;
  onChange: (icon: string) => void;
  /** 選択中のアイコンを塗る色（カテゴリの色に合わせる） */
  accent: string;
  /**
   * スクロール領域の高さ（px）。
   * % で指定すると Portal（ダイアログ）内で親の高さが解決されず潰れるため、
   * 必ず実数で渡すこと。
   */
  height?: number;
}

/**
 * カテゴリ用アイコンの選択。150種あるので用途別に見出しを付けて縦に並べる。
 *
 * 横スクロール1列だと端のアイコンに気づけず、実質10個くらいしか使われない。
 * 見出し付きの縦スクロールなら「食費まわりを探す」という探し方ができる。
 */
export function IconPicker({ value, onChange, accent, height = 220 }: Props) {
  const theme = useTheme();

  return (
    <ScrollView
      style={[
        styles.scroll,
        {
          height,
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      {ICON_GROUPS.map((group) => (
        <View key={group.label}>
          <Text
            variant="labelSmall"
            style={[styles.groupLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            {group.label}
          </Text>
          <View style={styles.grid}>
            {group.icons.map((icon) => {
              const selected = icon === value;
              return (
                <TouchableRipple
                  key={icon}
                  onPress={() => onChange(icon)}
                  style={styles.cell}
                  borderless
                  accessibilityLabel={icon}
                  accessibilityState={{ selected }}
                >
                  <CategoryTile
                    icon={icon}
                    color={selected ? accent : theme.colors.outline}
                    size={40}
                  />
                </TouchableRipple>
              );
            })}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { borderRadius: radius.md, borderWidth: 1 },
  content: { padding: spacing.sm, paddingBottom: spacing.md },
  groupLabel: { marginTop: spacing.sm, marginBottom: spacing.xs, marginLeft: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { borderRadius: radius.md },
});
