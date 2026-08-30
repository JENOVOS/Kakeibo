import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Dialog, IconButton, Portal, Text, TouchableRipple, useTheme } from 'react-native-paper';
import {
  currentYearMonth,
  daysInMonth,
  fromIso,
  shiftMonth,
  toIso,
  today,
  type IsoDate,
  type YearMonth,
} from '@/domain/period';
import { radius, spacing } from '@/theme';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

interface Props {
  visible: boolean;
  value: IsoDate;
  onDismiss: () => void;
  onConfirm: (value: IsoDate) => void;
}

/**
 * 日付選択。OS 標準のピッカーではなく自前で描いている。
 *
 * 標準ピッカーは年を変えるのに月を何回も送る必要があり、
 * 「去年の記録を入れる」「年払いの固定費を設定する」たびに操作が重かった。
 * ここでは年と月に独立した送りボタンを置き、年は1タップで動く。
 *
 * 自前にしたことで @react-native-community/datetimepicker の依存も外れ、
 * iOS と Android で見た目が揃うという副次的な利点もある。
 */
export function DatePickerDialog({ visible, value, onDismiss, onConfirm }: Props) {
  const theme = useTheme();
  const [cursor, setCursor] = useState<YearMonth>(currentYearMonth());
  const [selected, setSelected] = useState<IsoDate>(value);

  // 開くたびに、いま入っている日付の月を表示する
  useEffect(() => {
    if (!visible) return;
    const d = fromIso(value);
    setCursor({ year: d.getFullYear(), month: d.getMonth() + 1 });
    setSelected(value);
  }, [visible, value]);

  const total = daysInMonth(cursor.year, cursor.month);
  // その月の1日が何曜日か = グリッド先頭の空きマス数
  const leading = new Date(cursor.year, cursor.month - 1, 1).getDay();
  const cells: (number | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];
  const now = today();

  const isoOf = (day: number) =>
    toIso(new Date(cursor.year, cursor.month - 1, day));

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Content style={styles.content}>
          {/* 年 ------------------------------------------------- */}
          <View style={styles.stepper}>
            <IconButton
              icon="chevron-left"
              size={22}
              onPress={() =>
                setCursor((c) => ({ ...c, year: c.year - 1 }))
              }
              accessibilityLabel="前の年"
            />
            <Text variant="titleMedium" style={styles.stepperLabel}>
              {cursor.year}年
            </Text>
            <IconButton
              icon="chevron-right"
              size={22}
              onPress={() =>
                setCursor((c) => ({ ...c, year: c.year + 1 }))
              }
              accessibilityLabel="次の年"
            />
          </View>

          {/* 月 ------------------------------------------------- */}
          <View style={styles.stepper}>
            <IconButton
              icon="chevron-left"
              size={22}
              onPress={() => setCursor((c) => shiftMonth(c, -1))}
              accessibilityLabel="前の月"
            />
            <Text variant="titleMedium" style={styles.stepperLabel}>
              {cursor.month}月
            </Text>
            <IconButton
              icon="chevron-right"
              size={22}
              onPress={() => setCursor((c) => shiftMonth(c, 1))}
              accessibilityLabel="次の月"
            />
          </View>

          {/* 曜日見出し ----------------------------------------- */}
          <View style={styles.weekRow}>
            {WEEKDAYS.map((w, i) => (
              <View key={w} style={styles.cell}>
                <Text
                  variant="labelSmall"
                  style={{
                    color:
                      i === 0
                        ? theme.colors.error
                        : theme.colors.onSurfaceVariant,
                  }}
                >
                  {w}
                </Text>
              </View>
            ))}
          </View>

          {/* 日グリッド ----------------------------------------- */}
          <View style={styles.grid}>
            {cells.map((day, index) => {
              if (day === null) {
                return <View key={`blank-${index}`} style={styles.cell} />;
              }
              const iso = isoOf(day);
              const isSelected = iso === selected;
              const isToday = iso === now;
              return (
                <TouchableRipple
                  key={iso}
                  onPress={() => setSelected(iso)}
                  style={styles.cell}
                  borderless
                >
                  <View
                    style={[
                      styles.dayInner,
                      isSelected && { backgroundColor: theme.colors.primary },
                      !isSelected &&
                        isToday && {
                          borderWidth: 1.5,
                          borderColor: theme.colors.primary,
                        },
                    ]}
                  >
                    <Text
                      variant="bodyMedium"
                      style={{
                        color: isSelected
                          ? theme.colors.onPrimary
                          : theme.colors.onSurface,
                        fontWeight: isSelected || isToday ? '700' : '400',
                      }}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableRipple>
              );
            })}
          </View>

          <Button
            compact
            onPress={() => {
              const t = fromIso(now);
              setCursor({ year: t.getFullYear(), month: t.getMonth() + 1 });
              setSelected(now);
            }}
          >
            今日
          </Button>
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={onDismiss}>キャンセル</Button>
          <Button mode="contained" onPress={() => onConfirm(selected)}>
            決定
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  // 高さを % で指定すると Portal 内で解決されず中身が潰れるため、
  // 中身が自然に決まる高さのまま置く（スクロールさせない）。
  dialog: { borderRadius: radius.xl, alignSelf: 'center', width: 340, maxWidth: '92%' },
  content: { paddingBottom: 0 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepperLabel: { fontVariant: ['tabular-nums'] },
  weekRow: { flexDirection: 'row', marginTop: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
