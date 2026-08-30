import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Appbar,
  Button,
  Dialog,
  Portal,
  Text,
  TextInput,
  useTheme,
} from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { Amount } from '@/components/Amount';
import { CategoryPicker } from '@/components/CategoryPicker';
import { GoalPicker } from '@/components/GoalPicker';
import { DateField } from '@/components/DateField';
import { TextField } from '@/components/TextField';
import { TypeToggle } from '@/components/TypeToggle';
import type { EntryType } from '@/db/schema';
import { parseYen } from '@/domain/money';
import { today } from '@/domain/period';
import { useDbQuery } from '@/hooks/useDbQuery';
import { useEntitlement } from '@/stores/useEntitlement';
import { listByType } from '@/repositories/categories';
import { list as listGoals } from '@/repositories/savings';
import { create, getById, remove, update } from '@/repositories/transactions';
import { formatNumber } from '@/domain/money';
import { amountColor, cardShadow, font, radius, spacing } from '@/theme';

const TYPE_LABEL: Record<EntryType, string> = {
  expense: '支出',
  income: '収入',
  savings: '貯金',
};

/**
 * 支出・収入・貯金の入力画面（新規と編集を兼ねる）。
 *
 * 金額 → カテゴリ の順で上から並べ、日付は既定で今日にしてある。
 * 一番よくある入力（今日の支出）を、上から2タップ + 数字入力で終えられるようにするため。
 */
export default function EntryScreen() {
  const router = useRouter();
  const theme = useTheme();
  const isPro = useEntitlement((s) => s.isPro);
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const isEditing = editingId !== null && Number.isFinite(editingId);

  const [type, setType] = useState<EntryType>('expense');
  const [amountText, setAmountText] = useState('');
  const [occurredOn, setOccurredOn] = useState(today());
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [savingsGoalId, setSavingsGoalId] = useState<number | null>(null);
  const [memo, setMemo] = useState('');
  const [loaded, setLoaded] = useState(!isEditing);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  // 編集時に DB の値を入力欄へ流し込むのは1回だけ（→ TextField の説明を参照）
  const [formKey, setFormKey] = useState(0);

  // 未購入のあいだは貯金として保存させない（トグル側でも鍵をかけている）
  const isSavings = type === 'savings' && isPro;
  const categories = useDbQuery(
    () => listByType(type === 'savings' ? 'expense' : type),
    [type],
  );
  const goals = useDbQuery(() => listGoals(), []);

  useEffect(() => {
    if (!isEditing || editingId === null) return;
    let cancelled = false;
    (async () => {
      const row = await getById(editingId);
      if (cancelled || !row) return;
      setType(row.type);
      setAmountText(String(row.amount));
      setOccurredOn(row.occurredOn);
      setCategoryId(row.categoryId);
      setSavingsGoalId(row.savingsGoalId);
      setMemo(row.memo ?? '');
      setFormKey((k) => k + 1);
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, isEditing]);

  // 種別を切り替えたら、選択中のカテゴリは別の種別のものになるので外す
  useEffect(() => {
    if (!loaded || isSavings) return;
    const list = categories.data;
    if (!list) return;
    if (categoryId !== null && !list.some((c) => c.id === categoryId)) {
      setCategoryId(null);
    }
  }, [categories.data, categoryId, loaded, isSavings]);

  // 貯金は目標が1つだけなら選ぶまでもないので既定で選択しておく
  useEffect(() => {
    if (!isSavings || savingsGoalId !== null) return;
    const only = goals.data?.length === 1 ? goals.data[0] : null;
    if (only) setSavingsGoalId(only.id);
  }, [isSavings, goals.data, savingsGoalId]);

  const amount = parseYen(amountText);
  const amountInvalid = amountText.length > 0 && (amount === null || amount <= 0);
  // 貯金は積立先が決まっていないと記録できない（どこに貯めたか分からなくなるため）
  const canSave =
    amount !== null &&
    amount > 0 &&
    !saving &&
    (!isSavings || savingsGoalId !== null);
  const tint = amountColor(type, theme.dark);

  async function handleSave() {
    if (!canSave || amount === null) return;
    setSaving(true);
    try {
      const payload = {
        type,
        amount,
        occurredOn,
        categoryId: isSavings ? null : categoryId,
        savingsGoalId: isSavings ? savingsGoalId : null,
        memo: memo || null,
      };
      if (isEditing && editingId !== null) await update(editingId, payload);
      else await create(payload);

      await Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => undefined);
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
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Appbar.Header mode="small" elevated={false}>
        <Appbar.Action icon="close" onPress={() => router.back()} />
        <Appbar.Content title={isEditing ? '記録を編集' : '記録する'} />
        {isEditing ? (
          <Appbar.Action
            icon="trash-can-outline"
            onPress={() => setConfirmDelete(true)}
          />
        ) : null}
      </Appbar.Header>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <TypeToggle
          value={type}
          onChange={setType}
          onLockedSavings={() => router.push('/pro')}
        />

        {/* 金額（モック準拠: 右寄せの大きな数字） -------------------- */}
        <View
          style={[
            styles.amountCard,
            cardShadow,
            {
              backgroundColor: theme.colors.surface,
              borderColor: amountInvalid
                ? theme.colors.error
                : theme.colors.outlineVariant,
            },
          ]}
        >
          <View style={styles.amountRow}>
            <Amount size={16} weight={600} color={theme.colors.onSurfaceVariant}>
              ¥
            </Amount>
            <TextInput
              mode="flat"
              value={amountText}
              onChangeText={setAmountText}
              keyboardType="number-pad"
              placeholder="0"
              autoFocus={!isEditing}
              underlineStyle={styles.noUnderline}
              style={[styles.amountInput, { backgroundColor: 'transparent' }]}
              contentStyle={[
                styles.amountText,
                { color: amount ? tint : theme.colors.onSurfaceDisabled },
              ]}
              textAlign="right"
            />
          </View>
          <Text
            variant="bodySmall"
            style={[
              styles.amountHint,
              {
                color: amountInvalid
                  ? theme.colors.error
                  : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {amountInvalid
              ? '1以上の数字を入力してください'
              : amount
                ? `${TYPE_LABEL[type]} ¥${formatNumber(amount)}`
                : '金額を入力'}
          </Text>
        </View>

        <DateField label="日付" value={occurredOn} onChange={setOccurredOn} shortcuts />

        <Text
          variant="labelMedium"
          style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          {isSavings ? '積立先の目標' : 'カテゴリ'}
        </Text>
        {isSavings ? (
          <GoalPicker
            goals={goals.data ?? []}
            savedByGoal={
              new Map((goals.data ?? []).map((g) => [g.id, g.saved]))
            }
            value={savingsGoalId}
            onChange={setSavingsGoalId}
          />
        ) : (
          <CategoryPicker
            categories={categories.data ?? []}
            value={categoryId}
            onChange={setCategoryId}
            type={type === 'savings' ? 'expense' : type}
            allowCreate
          />
        )}

        <TextField
          resetKey={formKey}
          initialValue={memo}
          mode="outlined"
          label="メモ（任意）"
          onChangeText={setMemo}
          style={styles.memo}
        />

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
      </ScrollView>

      <Portal>
        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>この記録を削除しますか</Dialog.Title>
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
      </KeyboardAvoidingView>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 48 },
  amountCard: {
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  amountRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 6 },
  amountInput: { flex: 1, height: 62 },
  amountText: {
    fontSize: 40,
    fontFamily: font.numeric,
    letterSpacing: -0.8,
    fontVariant: ['tabular-nums'],
  },
  amountHint: { textAlign: 'right' },
  noUnderline: { height: 0 },
  sectionLabel: { marginBottom: spacing.sm },
  memo: { marginTop: spacing.lg },
  save: { marginTop: spacing.xl, borderRadius: radius.md },
  saveContent: { paddingVertical: spacing.sm },
});
