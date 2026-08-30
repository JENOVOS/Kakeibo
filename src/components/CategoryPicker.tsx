import { useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { CategoryCreateDialog } from './CategoryCreateDialog';
import { CategoryTile } from './CategoryTile';
import type { Category, CategoryType } from '@/db/schema';
import { radius, spacing, tileRadius } from '@/theme';

interface Props {
  categories: Category[];
  value: number | null;
  onChange: (id: number) => void;
  /** 末尾に「追加」セルを出し、その場でカテゴリを作れるようにする */
  type?: CategoryType;
  allowCreate?: boolean;
}

/**
 * カテゴリはドロップダウンではなくグリッドで出す。
 * 家計簿は「1日に何度も、片手で、素早く」入力するアプリなので、
 * 選択に必要なタップ数を1回に抑えるほうが体験に効く。
 *
 * 末尾の「追加」から、入力を中断せずに新しいカテゴリを作れる。
 */
export function CategoryPicker({
  categories,
  value,
  onChange,
  type,
  allowCreate = false,
}: Props) {
  const theme = useTheme();
  const [creating, setCreating] = useState(false);
  const canCreate = allowCreate && type !== undefined;

  return (
    <View>
      <View style={styles.grid}>
        {categories.map((category) => {
          const selected = category.id === value;
          return (
            <TouchableRipple
              key={category.id}
              onPress={() => {
                Keyboard.dismiss();
                onChange(category.id);
              }}
              style={[
                styles.cell,
                selected && {
                  backgroundColor: theme.colors.primaryContainer,
                },
              ]}
              borderless
            >
              <View style={styles.cellInner}>
                <CategoryTile
                  icon={category.icon}
                  color={category.color}
                  size={44}
                />
                <Text
                  variant="labelSmall"
                  numberOfLines={1}
                  style={{
                    color: selected
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurfaceVariant,
                    fontWeight: selected ? '700' : '400',
                  }}
                >
                  {category.name}
                </Text>
              </View>
            </TouchableRipple>
          );
        })}

        {canCreate ? (
          <TouchableRipple
            onPress={() => {
              Keyboard.dismiss();
              setCreating(true);
            }}
            style={styles.cell}
            borderless
            accessibilityLabel="カテゴリを追加"
          >
            <View style={styles.cellInner}>
              <View
                style={[
                  styles.addTile,
                  { borderColor: theme.colors.outline },
                ]}
              >
                <Icon source="plus" size={24} color={theme.colors.primary} />
              </View>
              <Text
                variant="labelSmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                追加
              </Text>
            </View>
          </TouchableRipple>
        ) : null}
      </View>

      {categories.length === 0 && !canCreate ? (
        <Text
          variant="bodySmall"
          style={{ color: theme.colors.onSurfaceVariant, paddingVertical: spacing.md }}
        >
          カテゴリがありません。設定から追加してください。
        </Text>
      ) : null}

      {canCreate ? (
        <CategoryCreateDialog
          visible={creating}
          type={type}
          onDismiss={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            // 作ったカテゴリをそのまま選択状態にする
            onChange(id);
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '25%',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
  },
  cellInner: { alignItems: 'center', gap: spacing.xs },
  addTile: {
    width: 44,
    height: 44,
    borderRadius: tileRadius(44),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
