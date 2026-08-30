import { useEffect, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Avatar,
  Button,
  Dialog,
  List,
  Portal,
  Switch,
  Text,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { CategoryTile } from '@/components/CategoryTile';
import { ColorPicker } from '@/components/ColorPicker';
import { IconPicker } from '@/components/IconPicker';
import { TextField } from '@/components/TextField';
import type { CategoryType } from '@/db/schema';
import {
  create,
  getById,
  remove,
  setArchived,
  update,
  usageCount,
} from '@/repositories/categories';
import { CATEGORY_COLORS, CATEGORY_ICONS } from '@/theme';

export default function CategoryEditScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string; type?: CategoryType }>();
  const editingId = params.id ? Number(params.id) : null;
  const isEditing = editingId !== null && Number.isFinite(editingId);

  const [type, setType] = useState<CategoryType>(params.type ?? 'expense');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState<string>(CATEGORY_ICONS[0]);
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [archived, setArchivedState] = useState(false);
  const [uses, setUses] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  // DB から読み込んだ値を入力欄へ流し込むのは1回だけ（→ TextField の説明を参照）
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (!isEditing || editingId === null) return;
    let cancelled = false;
    (async () => {
      const [row, count] = await Promise.all([
        getById(editingId),
        usageCount(editingId),
      ]);
      if (cancelled || !row) return;
      setType(row.type);
      setName(row.name);
      setIcon(row.icon);
      setColor(row.color);
      setArchivedState(row.isArchived);
      setUses(count);
      setFormKey((k) => k + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, isEditing]);

  const canSave = name.trim().length > 0 && !saving;
  const canDelete = isEditing && uses === 0;

  async function handleSave() {
    Keyboard.dismiss();
    if (!canSave) return;
    setSaving(true);
    try {
      if (isEditing && editingId !== null) {
        await update(editingId, { name, icon, color });
        await setArchived(editingId, archived);
      } else {
        await create({ type, name, icon, color });
      }
      router.back();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (editingId === null) return;
    await remove(editingId);
    setConfirmDelete(false);
    router.back();
  }

  // presentation: 'modal' の画面はネイティブ側で別レイヤーとして手前に出るため、
  // Paper の Portal を既定の位置（アプリ最上位）に描くとモーダルの背面に隠れる。
  // 画面内に Host を置くと、いちばん近いこの Host が使われて手前に出る。
  return (
    <Portal.Host>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.preview}>
        <CategoryTile icon={icon} color={color} size={64} />
        <Text variant="titleMedium">{name || 'カテゴリ名'}</Text>
        <Text variant="labelSmall" style={styles.muted}>
          {type === 'income' ? '収入カテゴリ' : '支出カテゴリ'}
        </Text>
      </View>

      <TextField
        resetKey={formKey}
        initialValue={name}
        mode="outlined"
        label="名前"
        onChangeText={setName}
      />

      <Text variant="labelMedium" style={styles.sectionLabel}>
        アイコン
      </Text>
      <IconPicker value={icon} onChange={setIcon} accent={color} height={260} />

      <Text variant="labelMedium" style={styles.sectionLabel}>
        色
      </Text>
      <ColorPicker value={color} onChange={setColor} />

      {isEditing ? (
        <List.Item
          title="アーカイブする"
          description="新しい記録の候補から外します（過去の記録は残ります）"
          right={() => (
            <Switch value={archived} onValueChange={setArchivedState} />
          )}
          style={styles.listItem}
        />
      ) : null}

      <Button
        mode="contained"
        onPress={() => void handleSave()}
        disabled={!canSave}
        loading={saving}
        style={styles.save}
        contentStyle={styles.saveContent}
      >
        保存
      </Button>

      {isEditing ? (
        <>
          <Button
            textColor={canDelete ? theme.colors.error : theme.colors.outline}
            disabled={!canDelete}
            onPress={() => setConfirmDelete(true)}
            style={styles.delete}
          >
            削除
          </Button>
          {!canDelete ? (
            <Text variant="bodySmall" style={styles.deleteNote}>
              {uses}件の記録で使われているため削除できません。アーカイブしてください。
            </Text>
          ) : null}
        </>
      ) : null}

      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>このカテゴリを削除しますか</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              このカテゴリに紐づく予算設定も一緒に削除されます。
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setConfirmDelete(false)}>キャンセル</Button>
            <Button textColor={theme.colors.error} onPress={() => void handleDelete()}>
              削除
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </ScrollView>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 48 },
  preview: { alignItems: 'center', gap: 6, marginBottom: 20 },
  muted: { opacity: 0.6 },
  sectionLabel: { opacity: 0.7, marginTop: 20, marginBottom: 8 },
  listItem: { paddingHorizontal: 0, marginTop: 12 },
  save: { marginTop: 24 },
  saveContent: { paddingVertical: 6 },
  delete: { marginTop: 8 },
  deleteNote: { opacity: 0.6, textAlign: 'center' },
});
