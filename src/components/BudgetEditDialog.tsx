import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  Button,
  Dialog,
  HelperText,
  Portal,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import type { BudgetPeriod } from '@/db/schema';
import { formatYen, parseYen } from '@/domain/money';

export interface BudgetTarget {
  categoryId: number | null;
  name: string;
  period: BudgetPeriod;
  /** 現在解決されている金額（既定 or 上書き）。未設定なら null */
  currentAmount: number | null;
  /** その期間固有の上書きが存在するか */
  hasOverride: boolean;
  year: number;
  month: number;
  periodLabel: string;
}

interface Props {
  target: BudgetTarget | null;
  onDismiss: () => void;
  /** scope: 'default' = 既定を変更 / 'period' = この期間だけ上書き */
  onSubmit: (amount: number, scope: 'default' | 'period') => void;
  onClear: (scope: 'default' | 'period') => void;
}

/**
 * 予算の編集。
 *
 * 「毎月ずっとこの額」と「今月だけこの額」は日常的にどちらも起きるので、
 * どちらを書き換えているのかを常に画面上で明示する。
 * これを曖昧にすると、来月になって値が戻る/戻らないでユーザーが混乱する。
 */
export function BudgetEditDialog({
  target,
  onDismiss,
  onSubmit,
  onClear,
}: Props) {
  const theme = useTheme();
  const [text, setText] = useState('');
  const [periodOnly, setPeriodOnly] = useState(false);

  useEffect(() => {
    if (!target) return;
    setText(target.currentAmount ? String(target.currentAmount) : '');
    setPeriodOnly(target.hasOverride);
  }, [target]);

  if (!target) return null;

  const parsed = parseYen(text);
  const invalid = text.length > 0 && parsed === null;
  const scope = periodOnly ? 'period' : 'default';
  const defaultLabel = target.period === 'monthly' ? '毎月' : '毎年';

  return (
    <Portal>
      <Dialog visible onDismiss={onDismiss}>
        <Dialog.Title>{target.name}の予算</Dialog.Title>
        <Dialog.Content>
          <TextInput
            mode="outlined"
            label="金額"
            value={text}
            onChangeText={setText}
            keyboardType="number-pad"
            autoFocus
            left={<TextInput.Affix text="¥" />}
          />
          <HelperText type={invalid ? 'error' : 'info'} visible>
            {invalid
              ? '数字で入力してください'
              : parsed
                ? formatYen(parsed)
                : '空にすると予算を解除します'}
          </HelperText>

          <View style={styles.scopeRow}>
            <View style={styles.scopeText}>
              <Text variant="bodyMedium">
                {target.periodLabel}だけに適用
              </Text>
              <Text variant="bodySmall" style={styles.muted}>
                {periodOnly
                  ? `${defaultLabel}の設定はそのまま残ります`
                  : `${defaultLabel}の既定値として保存します`}
              </Text>
            </View>
            <Switch value={periodOnly} onValueChange={setPeriodOnly} />
          </View>
        </Dialog.Content>

        <Dialog.Actions style={styles.actions}>
          {target.currentAmount !== null ? (
            <Button textColor={theme.colors.error} onPress={() => onClear(scope)}>
              解除
            </Button>
          ) : null}
          <View style={styles.spacer} />
          <Button onPress={onDismiss}>キャンセル</Button>
          <Button
            mode="contained"
            disabled={invalid}
            onPress={() => onSubmit(parsed ?? 0, scope)}
          >
            保存
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  scopeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  scopeText: { flex: 1 },
  muted: { opacity: 0.6 },
  actions: { flexDirection: 'row', alignItems: 'center' },
  spacer: { flex: 1 },
});
