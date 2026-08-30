import { StyleSheet, View } from 'react-native';
import { TouchableRipple, useTheme } from 'react-native-paper';
import { CATEGORY_COLORS, radius, spacing } from '@/theme';

interface Props {
  value: string;
  onChange: (color: string) => void;
}

export function ColorPicker({ value, onChange }: Props) {
  const theme = useTheme();

  return (
    <View style={styles.grid}>
      {CATEGORY_COLORS.map((color) => {
        const selected = color === value;
        return (
          <TouchableRipple
            key={color}
            onPress={() => onChange(color)}
            style={styles.cell}
            borderless
            accessibilityState={{ selected }}
          >
            <View
              style={[
                styles.swatch,
                { backgroundColor: color },
                selected && {
                  borderWidth: 3,
                  borderColor: theme.colors.onSurface,
                },
              ]}
            />
          </TouchableRipple>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: { borderRadius: radius.pill },
  swatch: { width: 38, height: 38, borderRadius: radius.pill },
});
