import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { addDays } from 'date-fns';
import { DatePickerDialog } from './DatePickerDialog';
import { formatDateLong, toIso, today, type IsoDate } from '@/domain/period';
import { radius, spacing } from '@/theme';

interface Props {
  label?: string;
  value: IsoDate;
  onChange: (value: IsoDate) => void;
  /** 「今日 / 昨日」のショートカットを出す（取引入力向け） */
  shortcuts?: boolean;
  clearable?: boolean;
  onClear?: () => void;
}

/**
 * 日付入力。実際の入力の大半は「今日」なので、
 * ピッカーを開かせずに済むショートカットを併置する。
 *
 * 触れたら必ずキーボードを閉じる。金額欄が autoFocus で開いた状態のまま
 * ピッカーを出すと、カレンダーと決定ボタンがキーボードに隠れて操作できなくなる。
 * 親の ScrollView は keyboardShouldPersistTaps="handled" なので
 * タップは届くが自動では閉じないため、ここで明示的に閉じる必要がある。
 */
export function DateField({
  label,
  value,
  onChange,
  shortcuts = false,
  clearable = false,
  onClear,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const now = today();
  const yesterday = toIso(addDays(new Date(), -1));

  const chip = (
    text: string,
    active: boolean,
    onPress: () => void,
    key: string,
  ) => (
    <TouchableRipple
      key={key}
      onPress={() => {
        Keyboard.dismiss();
        onPress();
      }}
      style={[
        styles.chip,
        {
          backgroundColor: active
            ? theme.colors.primaryContainer
            : 'transparent',
          borderColor: active ? theme.colors.primary : theme.colors.outlineVariant,
        },
      ]}
      borderless
    >
      <Text
        variant="labelMedium"
        style={{
          color: active
            ? theme.colors.onPrimaryContainer
            : theme.colors.onSurfaceVariant,
        }}
      >
        {text}
      </Text>
    </TouchableRipple>
  );

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text
          variant="labelMedium"
          style={[styles.label, { color: theme.colors.onSurfaceVariant }]}
        >
          {label}
        </Text>
      ) : null}

      <TouchableRipple
        onPress={() => {
          Keyboard.dismiss();
          setOpen(true);
        }}
        style={[
          styles.field,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outlineVariant,
          },
        ]}
        borderless
      >
        <View style={styles.fieldInner}>
          <Icon source="calendar-blank-outline" size={20} color={theme.colors.primary} />
          <Text variant="bodyLarge" style={styles.fieldText}>
            {formatDateLong(value)}
          </Text>
          <Icon source="chevron-down" size={20} color={theme.colors.onSurfaceVariant} />
        </View>
      </TouchableRipple>

      {shortcuts || (clearable && onClear) ? (
        <View style={styles.chips}>
          {shortcuts
            ? [
                chip('今日', value === now, () => onChange(now), 'today'),
                chip('昨日', value === yesterday, () => onChange(yesterday), 'yst'),
              ]
            : null}
          {clearable && onClear ? chip('なし', false, onClear, 'clear') : null}
        </View>
      ) : null}

      <DatePickerDialog
        visible={open}
        value={value}
        onDismiss={() => setOpen(false)}
        onConfirm={(iso) => {
          onChange(iso);
          setOpen(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.md },
  label: { marginBottom: spacing.xs + 2 },
  field: { borderRadius: radius.md, borderWidth: 1 },
  fieldInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
  },
  fieldText: { flex: 1 },
  chips: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
});
