import { Keyboard, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import type { EntryType } from '@/db/schema';
import { amountColor, radius, spacing } from '@/theme';
import { useEntitlement } from '@/stores/useEntitlement';

interface Props {
  value: EntryType;
  onChange: (value: EntryType) => void;
  /** 貯金枠を出すか。予算の集計など貯金が意味を持たない画面では false */
  includeSavings?: boolean;
  /** 未購入で貯金が押されたとき（課金画面へ誘導する） */
  onLockedSavings?: () => void;
}

/**
 * 支出と収入の切り替え。要件「支出と収入を別で管理する」を
 * 入力画面のなかで一貫して表現する中心的なコントロール。
 *
 * 選択中はその種別の色（赤/緑）で塗る。テーマ色ではなく意味の色を使うことで、
 * どちらを入力しているのかを画面を見た瞬間に取り違えないようにする。
 */
export function TypeToggle({
  value,
  onChange,
  includeSavings = true,
  onLockedSavings,
}: Props) {
  const theme = useTheme();
  const isPro = useEntitlement((s) => s.isPro);

  const tab = (type: EntryType, label: string, icon: string) => {
    const active = value === type;
    const color = amountColor(type, theme.dark);
    // 貯金は買い切りの機能。未購入でも枠は見せて、押したら案内へ送る
    const locked = type === 'savings' && !isPro;
    return (
      <TouchableRipple
        key={type}
        onPress={() => {
          Keyboard.dismiss();
          if (locked) {
            onLockedSavings?.();
            return;
          }
          onChange(type);
        }}
        style={[
          styles.tab,
          active && { backgroundColor: color },
        ]}
        borderless
        accessibilityState={{ selected: active }}
      >
        <View style={styles.tabInner}>
          <Icon
            source={locked ? 'lock' : icon}
            size={18}
            color={active ? '#FFFFFF' : theme.colors.onSurfaceVariant}
          />
          <Text
            variant="labelLarge"
            style={{
              color: active ? '#FFFFFF' : theme.colors.onSurfaceVariant,
              fontWeight: active ? '700' : '500',
            }}
          >
            {label}
          </Text>
        </View>
      </TouchableRipple>
    );
  };

  return (
    <View
      style={[styles.root, { backgroundColor: theme.colors.surfaceVariant }]}
    >
      {tab('expense', '支出', 'arrow-up-circle')}
      {tab('income', '収入', 'arrow-down-circle')}
      {includeSavings ? tab('savings', '貯金', 'piggy-bank') : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  tab: { flex: 1, borderRadius: radius.pill },
  tabInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
});
