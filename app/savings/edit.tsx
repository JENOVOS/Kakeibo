import { useEffect, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Dialog,
  HelperText,
  List,
  Portal,
  Switch,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import { CategoryTile } from '@/components/CategoryTile';
import { ColorPicker } from '@/components/ColorPicker';
import { DateField } from '@/components/DateField';
import { IconPicker } from '@/components/IconPicker';
import { TextField } from '@/components/TextField';
import { formatNumber, parseYen } from '@/domain/money';
import { toIso } from '@/domain/period';
import { requiredMonthlyPace } from '@/domain/savings';
import {
  create,
  getById,
  remove,
  setArchived,
  update,
  usageCount,
} from '@/repositories/savings';
import { radius, spacing } from '@/theme';

/**
 * 貯金の目標の作成・編集。
 *
 * 「何のために・いくら・いつまでに」の3つが揃うと、
 * 月あたりいくら積めばよいかを出せる。目標を立てる時点で
 * その額が現実的かどうか確かめられるようにしている。
 */
export default function SavingsEditScreen() {
  const router = useRouter();
  const theme = useTheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const isEditing = editingId !== null && Number.isFinite(editingId);

  const [name, setName] = useState('');
  const [amountText, setAmountText] = useState('');
  const [hasDeadline, setHasDeadline] = useState(true);
  const [targetDate, setTargetDate] = useState(() => {
    const now = new Date();
    return toIso(new Date(now.getFullYear() + 1, now.getMonth(), 1));
  });
  const [memo, setMemo] = useState('');
  const [icon, setIcon] = useState('piggy-bank');
  const [color, setColor] = useState('#2FA37B');
  const [archived, setArchivedState] = useState(false);
  const [uses, setUses] = useState(0);
  const [saved, setSaved] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
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
      setName(row.name);
      setAmountText(String(row.targetAmount));
      setHasDeadline(row.targetDate !== null);
      if (row.targetDate) setTargetDate(row.targetDate);
      setMemo(row.memo ?? '');
      setIcon(row.icon);
      setColor(row.color);
      setArchivedState(row.isArchived);
      setUses(count);
      setSaved(row.saved);
      setFormKey((k) => k + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, isEditing]);

  const amount = parseYen(amountText);
  const amountInvalid = amountText.length > 0 && (amount === null || amount <= 0);
  const canSave =
    name.trim().length > 0 && amount !== null && amount > 0 && !saving;
  const canDelete = isEditing && uses === 0;

  const pace =
    amount !== null && hasDeadline
      ? requiredMonthlyPace(Math.max(0, amount - saved), targetDate)
      : null;

  async function handleSave() {
    Keyboard.dismiss();
    if (!canSave || amount === null) return;
    setSaving(true);
    try {
      const payload = {
        name,
        targetAmount: amount,
        targetDate: hasDeadline ? targetDate : null,
        memo: memo || null,
        icon,
        color,
      };
      if (isEditing && editingId !== null) {
        await update(editingId, payload);
        await setArchived(editingId, archived);
      } else {
        await create(payload);
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

  return (
    <Portal.Host>
      <ScrollView
        style={{ backgroundColor: theme.colors.background }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.preview}>
          <CategoryTile icon={icon} color={color} size={64} />
          <Text variant="titleMedium">{name || '貯金の目的'}</Text>
        </View>

        <TextField
          resetKey={`name-${formKey}`}
          initialValue={name}
          mode="outlined"
          label="目的"
          placeholder="沖縄旅行、引っ越し費用など"
          onChangeText={setName}
        />

        <View style={styles.gap} />
        <TextInput
          mode="outlined"
          label="目標金額"
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="number-pad"
          left={<TextInput.Affix text="¥" />}
        />
        <HelperText type={amountInvalid ? 'error' : 'info'} visible>
          {amountInvalid
            ? '1以上の数字を入力してください'
            : amount
              ? `¥${formatNumber(amount)}`
              : ' '}
        </HelperText>

        <List.Item
          title="目標日を決める"
          description={
            hasDeadline
              ? '必要な積立ペースを計算します'
              : '期限なしで積み立てます'
          }
          right={() => (
            <Switch value={hasDeadline} onValueChange={setHasDeadline} />
          )}
          style={styles.listItem}
        />

        {hasDeadline ? (
          <DateField label="目標日" value={targetDate} onChange={setTargetDate} />
        ) : null}

        {pace !== null ? (
          <View
            style={[
              styles.pace,
              { backgroundColor: theme.colors.primaryContainer },
            ]}
          >
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onPrimaryContainer }}
            >
              目標日までに毎月 ¥{formatNumber(pace)} 積み立てると届きます
              {saved > 0 ? `（積立済み ¥${formatNumber(saved)}）` : ''}
            </Text>
          </View>
        ) : null}

        <Text
          variant="labelMedium"
          style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          アイコン
        </Text>
        <IconPicker value={icon} onChange={setIcon} accent={color} height={220} />

        <Text
          variant="labelMedium"
          style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          色
        </Text>
        <ColorPicker value={color} onChange={setColor} />

        <View style={styles.gap} />
        <TextField
          resetKey={`memo-${formKey}`}
          initialValue={memo}
          mode="outlined"
          label="メモ（任意）"
          onChangeText={setMemo}
        />

        {isEditing ? (
          <List.Item
            title="アーカイブする"
            description="記録画面の積立先から外します（記録は残ります）"
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
              <Text
                variant="bodySmall"
                style={[
                  styles.deleteNote,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {uses}件の積立があるため削除できません。アーカイブしてください。
              </Text>
            ) : null}
          </>
        ) : null}

        <Portal>
          <Dialog
            visible={confirmDelete}
            onDismiss={() => setConfirmDelete(false)}
          >
            <Dialog.Title>この目標を削除しますか</Dialog.Title>
            <Dialog.Content>
              <Text variant="bodyMedium">元に戻すことはできません。</Text>
            </Dialog.Content>
            <Dialog.Actions>
              <Button onPress={() => setConfirmDelete(false)}>キャンセル</Button>
              <Button
                textColor={theme.colors.error}
                onPress={() => void handleDelete()}
              >
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
  content: { padding: spacing.lg, paddingBottom: 48 },
  preview: { alignItems: 'center', gap: 6, marginBottom: 20 },
  gap: { height: spacing.md },
  listItem: { paddingHorizontal: 0 },
  pace: {
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  save: { marginTop: spacing.xl, borderRadius: radius.md },
  saveContent: { paddingVertical: spacing.sm },
  delete: { marginTop: spacing.sm },
  deleteNote: { textAlign: 'center' },
});
