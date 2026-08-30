import { StyleSheet, View } from 'react-native';
import { Button, Dialog, Portal, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { radius, spacing } from '@/theme';

export interface GridOption {
  value: number;
  label: string;
}

interface Props {
  visible: boolean;
  title: string;
  options: GridOption[];
  value: number;
  /** 1行に並べる数。日付は7、月は4が読みやすい */
  columns?: number;
  onSelect: (value: number) => void;
  onDismiss: () => void;
  footnote?: string;
}

/**
 * 数値をグリッドで選ぶダイアログ（固定費の「毎月N日」「毎年M月」用）。
 *
 * 以前はスクロールする一覧を Dialog.ScrollArea に入れていたが、
 * Dialog に maxHeight を % で指定すると Portal 内で親の高さが解決されず、
 * 中の ScrollView が高さ 0 に潰れて「開くが何も選べない」状態になっていた。
 *
 * 選択肢は最大でも31個なので、スクロールさせずに全部並べれば
 * その不具合の余地ごと無くせるうえ、目的の数字を探す手間も減る。
 */
export function OptionGridDialog({
  visible,
  title,
  options,
  value,
  columns = 7,
  onSelect,
  onDismiss,
  footnote,
}: Props) {
  const theme = useTheme();

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <View style={styles.grid}>
            {options.map((option) => {
              const selected = option.value === value;
              return (
                <TouchableRipple
                  key={option.value}
                  onPress={() => onSelect(option.value)}
                  style={[styles.cell, { width: `${100 / columns}%` }]}
                  borderless
                >
                  <View
                    style={[
                      styles.cellInner,
                      selected && { backgroundColor: theme.colors.primary },
                    ]}
                  >
                    <Text
                      variant="bodyMedium"
                      style={{
                        color: selected
                          ? theme.colors.onPrimary
                          : theme.colors.onSurface,
                        fontWeight: selected ? '700' : '400',
                      }}
                    >
                      {option.label}
                    </Text>
                  </View>
                </TouchableRipple>
              );
            })}
          </View>

          {footnote ? (
            <Text
              variant="bodySmall"
              style={[styles.footnote, { color: theme.colors.onSurfaceVariant }]}
            >
              {footnote}
            </Text>
          ) : null}
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>閉じる</Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { borderRadius: radius.xl, alignSelf: 'center', width: 340, maxWidth: '92%' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  cellInner: {
    width: 38,
    height: 38,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: { marginTop: spacing.md },
});
