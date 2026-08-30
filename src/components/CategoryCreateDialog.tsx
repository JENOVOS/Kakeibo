import { useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import {
  Avatar,
  Button,
  Dialog,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { CategoryTile } from './CategoryTile';
import { ColorPicker } from './ColorPicker';
import { IconPicker } from './IconPicker';
import { TextField } from './TextField';
import type { CategoryType } from '@/db/schema';
import { create } from '@/repositories/categories';
import { CATEGORY_COLORS, CATEGORY_ICONS, radius, spacing } from '@/theme';

interface Props {
  visible: boolean;
  type: CategoryType;
  onDismiss: () => void;
  /** 作成したカテゴリを即座に選択状態にするため id を返す */
  onCreated: (id: number) => void;
}

/**
 * 記録の途中でカテゴリを追加するためのダイアログ。
 *
 * 「設定画面まで戻って作ってから入力し直す」という往復が、
 * 記録をやめる一番の理由になる。入力の流れを切らずに足せることを優先し、
 * 名前・アイコン・色だけに絞った軽い作成 UI にしてある。
 */
export function CategoryCreateDialog({
  visible,
  type,
  onDismiss,
  onCreated,
}: Props) {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [color, setColor] = useState<string>(CATEGORY_COLORS[9]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 開くたびに入力欄を作り直して空にする（→ TextField の説明を参照）
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!visible) return;
    setName('');
    setIcon(type === 'income' ? 'cash' : CATEGORY_ICONS[0]);
    setColor(CATEGORY_COLORS[9]);
    setError(null);
    setFormKey((k) => k + 1);
  }, [visible, type]);

  async function handleCreate() {
    Keyboard.dismiss();
    const trimmed = name.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      const id = await create({ type, name: trimmed, icon, color });
      onCreated(id);
    } catch {
      // (type, name) のユニーク制約に当たるのが唯一の現実的な失敗
      setError('同じ名前のカテゴリがすでにあります');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss} style={styles.dialog}>
        <Dialog.Title>
          {type === 'income' ? '収入' : '支出'}カテゴリを追加
        </Dialog.Title>
        <Dialog.Content>
          <View style={styles.preview}>
            <CategoryTile icon={icon} color={color} size={52} />
            <TextField
              resetKey={formKey}
              mode="outlined"
              label="名前"
              onChangeText={(t) => {
                setName(t);
                setError(null);
              }}
              autoFocus
              style={styles.nameInput}
              error={error !== null}
            />
          </View>
          {error ? (
            <Text variant="bodySmall" style={{ color: theme.colors.error }}>
              {error}
            </Text>
          ) : null}

          <Text
            variant="labelMedium"
            style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            アイコン
          </Text>
          <IconPicker
            value={icon}
            onChange={setIcon}
            accent={color}
            height={200}
          />

          <Text
            variant="labelMedium"
            style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
          >
            色
          </Text>
          <ColorPicker value={color} onChange={setColor} />
        </Dialog.Content>

        <Dialog.Actions>
          <Button onPress={onDismiss}>キャンセル</Button>
          <Button
            mode="contained"
            disabled={name.trim().length === 0 || saving}
            loading={saving}
            onPress={() => void handleCreate()}
          >
            追加
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { borderRadius: radius.xl },
  preview: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  nameInput: { flex: 1 },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
});
