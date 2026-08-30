import { useEffect, useState } from 'react';
import { Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Button,
  Dialog,
  Divider,
  HelperText,
  Icon,
  List,
  Portal,
  SegmentedButtons,
  Switch,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { CategoryPicker } from '@/components/CategoryPicker';
import { GoalPicker } from '@/components/GoalPicker';
import { DateField } from '@/components/DateField';
import { OptionGridDialog } from '@/components/OptionGridDialog';
import { TextField } from '@/components/TextField';
import { TypeToggle } from '@/components/TypeToggle';
import type { EntryType, RecurrenceKind } from '@/db/schema';
import { formatYen, parseYen } from '@/domain/money';
import { formatDateMedium, fromIso, toIso, today } from '@/domain/period';
import {
  describeRule,
  enumerateOccurrences,
  MAX_OCCURRENCES,
  nextOccurrenceOnOrAfter,
} from '@/domain/recurring';
import { useDbQuery } from '@/hooks/useDbQuery';
import { useEntitlement } from '@/stores/useEntitlement';
import { listByType } from '@/repositories/categories';
import { list as listGoals } from '@/repositories/savings';
import { create, getById, remove, update } from '@/repositories/recurrings';
import { createMany } from '@/repositories/transactions';
import { rescheduleRecurringReminders } from '@/services/notifications';
import { radius, spacing } from '@/theme';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];
const NOTIFY_OPTIONS: { value: number | null; label: string }[] = [
  { value: null, label: 'なし' },
  { value: 0, label: '当日' },
  { value: 1, label: '前日' },
  { value: 3, label: '3日前' },
  { value: 7, label: '1週間前' },
];

/**
 * 固定費の登録・編集。
 *
 * 繰り返しは「毎月N日 / 毎年M月N日 / 毎週W曜」の3種類に絞っている。
 * 汎用の繰り返し規則（rrule）は表現力は高いが、設定 UI が一気に難しくなる割に
 * 家計簿の固定費ではまず使われないため採らない。
 */
export default function RecurringEditScreen() {
  const router = useRouter();
  const theme = useTheme();
  const isPro = useEntitlement((s) => s.isPro);
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id ? Number(params.id) : null;
  const isEditing = editingId !== null && Number.isFinite(editingId);

  const [name, setName] = useState('');
  const [type, setType] = useState<EntryType>('expense');
  const [amountText, setAmountText] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [savingsGoalId, setSavingsGoalId] = useState<number | null>(null);
  const [kind, setKind] = useState<RecurrenceKind>('monthly');
  const [day, setDay] = useState(25);
  const [month, setMonth] = useState(1);
  const [startsOn, setStartsOn] = useState(today());
  const [endsOn, setEndsOn] = useState<string | null>(null);
  const [autoPost, setAutoPost] = useState(true);
  const [notifyDaysBefore, setNotifyDaysBefore] = useState<number | null>(1);
  const [memo, setMemo] = useState('');

  /**
   * continuous … 規則を保存し、期日が来るたびに自動で記録する（従来の動作）
   * bulk       … 規則は保存せず、指定期間の該当日ぶんを今すぐまとめて記録する
   */
  const [mode, setMode] = useState<'continuous' | 'bulk'>('continuous');
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDone, setBulkDone] = useState<number | null>(null);

  const [dayPicker, setDayPicker] = useState(false);
  const [monthPicker, setMonthPicker] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);
  // 編集時に DB の値を入力欄へ流し込むのは1回だけ（→ TextField の説明を参照）
  const [formKey, setFormKey] = useState(0);

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
      setName(row.name);
      setType(row.type);
      setAmountText(String(row.amount));
      setCategoryId(row.categoryId);
      setSavingsGoalId(row.savingsGoalId);
      setKind(row.kind);
      setDay(row.day);
      setMonth(row.month ?? 1);
      setStartsOn(row.startsOn);
      setEndsOn(row.endsOn);
      setAutoPost(row.autoPost);
      setNotifyDaysBefore(row.notifyDaysBefore);
      setMemo(row.memo ?? '');
      setFormKey((k) => k + 1);
    })();
    return () => {
      cancelled = true;
    };
  }, [editingId, isEditing]);

  useEffect(() => {
    if (isSavings) return;
    const list = categories.data;
    if (!list) return;
    if (categoryId !== null && !list.some((c) => c.id === categoryId)) {
      setCategoryId(null);
    }
  }, [categories.data, categoryId, isSavings]);

  // 目標が1つだけなら選ぶまでもないので既定で選択しておく
  useEffect(() => {
    if (!isSavings || savingsGoalId !== null) return;
    const only = goals.data?.length === 1 ? goals.data[0] : null;
    if (only) setSavingsGoalId(only.id);
  }, [isSavings, goals.data, savingsGoalId]);

  // 一括モードは終了日が必須。切り替えた時点で1年後を既定として入れておく
  useEffect(() => {
    if (mode !== 'bulk' || isEditing || endsOn !== null) return;
    const d = fromIso(startsOn);
    setEndsOn(toIso(new Date(d.getFullYear() + 1, d.getMonth(), d.getDate())));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // 繰り返し種別を変えると day の意味が変わるため、範囲外なら既定値に寄せる
  useEffect(() => {
    if (kind === 'weekly') {
      if (day > 6) setDay(0);
    } else if (day === 0) {
      setDay(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const amount = parseYen(amountText);
  const amountInvalid = amountText.length > 0 && (amount === null || amount <= 0);
  const canSave =
    name.trim().length > 0 &&
    amount !== null &&
    amount > 0 &&
    !saving &&
    (!isSavings || savingsGoalId !== null);

  const rule = {
    kind,
    day,
    month: kind === 'yearly' ? month : null,
    startsOn,
    endsOn,
  };
  const preview = nextOccurrenceOnOrAfter(rule, startsOn);

  const isBulk = mode === 'bulk' && !isEditing;
  // 一括モードでは終了日が必須（無期限にまとめて追加はできない）
  const bulkTo = endsOn;
  const bulk = isBulk && bulkTo
    ? enumerateOccurrences(rule, startsOn, bulkTo)
    : { dates: [] as string[], truncated: false };
  const canBulk =
    isBulk && bulkTo !== null && bulk.dates.length > 0 && amount !== null && amount > 0;

  async function handleSave() {
    Keyboard.dismiss();
    if (!canSave || amount === null) return;
    setSaving(true);
    try {
      const payload = {
        name,
        type,
        amount,
        categoryId: isSavings ? null : categoryId,
        savingsGoalId: isSavings ? savingsGoalId : null,
        memo: memo || null,
        kind,
        day,
        month: kind === 'yearly' ? month : null,
        startsOn,
        endsOn,
        autoPost,
        notifyDaysBefore,
      };
      if (isEditing && editingId !== null) await update(editingId, payload);
      else await create(payload);

      await rescheduleRecurringReminders().catch(() => undefined);
      router.back();
    } finally {
      setSaving(false);
    }
  }

  /** 期間を指定して今すぐまとめて記録する。固定費の行は作らない */
  async function handleBulkCreate() {
    if (!canBulk || amount === null) return;
    setSaving(true);
    try {
      const count = await createMany(
        {
          type,
          amount,
          categoryId: isSavings ? null : categoryId,
          savingsGoalId: isSavings ? savingsGoalId : null,
          memo: memo || name || null,
        },
        bulk.dates,
      );
      setBulkConfirm(false);
      setBulkDone(count);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (editingId === null) return;
    await remove(editingId);
    await rescheduleRecurringReminders().catch(() => undefined);
    setConfirmDelete(false);
    router.back();
  }

  const dayOptions =
    kind === 'weekly'
      ? WEEKDAYS.map((label, value) => ({ value, label }))
      : Array.from({ length: 31 }, (_, i) => ({
          value: i + 1,
          label: String(i + 1),
        }));

  const dayLabel =
    kind === 'weekly'
      ? `${WEEKDAYS[day] ?? '日'}曜日`
      : day >= 31
        ? '月末'
        : `${day}日`;

  /** 「毎月 / 毎年 / 毎週」の右に置く選択ボタン */
  const selector = (
    label: string,
    value: string,
    onPress: () => void,
    key: string,
  ) => (
    <TouchableRipple
      key={key}
      onPress={onPress}
      style={[
        styles.selector,
        {
          backgroundColor: theme.colors.surfaceVariant,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
      borderless
    >
      <View style={styles.selectorInner}>
        <Text
          variant="labelSmall"
          style={{ color: theme.colors.onSurfaceVariant }}
        >
          {label}
        </Text>
        <View style={styles.selectorValue}>
          <Text variant="titleMedium">{value}</Text>
          <Icon
            source="chevron-down"
            size={18}
            color={theme.colors.onSurfaceVariant}
          />
        </View>
      </View>
    </TouchableRipple>
  );

  // presentation: 'modal' の画面はネイティブ側で別レイヤーとして手前に出るため、
  // Paper の Portal を既定の位置（アプリ最上位）に描くとモーダルの背面に隠れる。
  // 画面内に Host を置くと、いちばん近いこの Host が使われて手前に出る。
  return (
    <Portal.Host>
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {!isEditing ? (
          <View style={styles.modeBlock}>
            <SegmentedButtons
              value={mode}
              onValueChange={(v) => setMode(v as 'continuous' | 'bulk')}
              density="medium"
              buttons={[
                { value: 'continuous', label: '継続して自動', icon: 'autorenew' },
                { value: 'bulk', label: 'まとめて追加', icon: 'calendar-multiple' },
              ]}
            />
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {isBulk
                ? '規則は保存せず、指定した期間の該当日ぶんを今すぐ記録します。あとから1件ずつ編集できます。'
                : '規則を保存し、期日が来るたびに自動で記録します。'}
            </Text>
          </View>
        ) : null}

        <TextField
          resetKey={`name-${formKey}`}
          initialValue={name}
          mode="outlined"
          label={isBulk ? '名前（メモとして記録されます）' : '名前'}
          placeholder="家賃、電気代、サブスクなど"
          onChangeText={setName}
        />

        <View style={styles.gap} />
        <TypeToggle
          value={type}
          onChange={setType}
          onLockedSavings={() => router.push('/pro')}
        />

        <View style={styles.gap} />
        <TextInput
          mode="outlined"
          label="金額"
          value={amountText}
          onChangeText={setAmountText}
          keyboardType="number-pad"
          left={<TextInput.Affix text="¥" />}
        />
        <HelperText type={amountInvalid ? 'error' : 'info'} visible={!!amountText}>
          {amountInvalid ? '1以上の数字を入力してください' : formatYen(amount ?? 0)}
        </HelperText>

        {/* 繰り返し規則 --------------------------------------------- */}
        <Text
          variant="labelMedium"
          style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          繰り返し
        </Text>
        <SegmentedButtons
          value={kind}
          onValueChange={(v) => setKind(v as RecurrenceKind)}
          density="medium"
          buttons={[
            { value: 'monthly', label: '毎月' },
            { value: 'yearly', label: '毎年' },
            { value: 'weekly', label: '毎週' },
          ]}
        />

        <View style={styles.selectorRow}>
          {kind === 'yearly'
            ? selector('月', `${month}月`, () => setMonthPicker(true), 'month')
            : null}
          {selector(
            kind === 'weekly' ? '曜日' : '日',
            dayLabel,
            () => setDayPicker(true),
            'day',
          )}
        </View>

        <View
          style={[
            styles.preview,
            { backgroundColor: theme.colors.primaryContainer },
          ]}
        >
          <Icon
            source="calendar-check"
            size={16}
            color={theme.colors.onPrimaryContainer}
          />
          <Text
            variant="bodySmall"
            style={{ color: theme.colors.onPrimaryContainer }}
          >
            {describeRule(rule)}
            {isBulk
              ? bulkTo === null
                ? ' · 終了日を選んでください'
                : bulk.dates.length === 0
                  ? ' · この期間に該当する日がありません'
                  : ` · ${bulk.dates.length}件（${formatDateMedium(
                      bulk.dates[0],
                    )} 〜 ${formatDateMedium(bulk.dates[bulk.dates.length - 1])}）`
              : preview
                ? ` · 次回は ${formatDateMedium(preview)}`
                : ' · 期間内に発生しません'}
          </Text>
        </View>

        <DateField
          label={isBulk ? '追加する期間の開始日' : '開始日'}
          value={startsOn}
          onChange={setStartsOn}
        />
        <DateField
          label={isBulk ? '追加する期間の終了日' : '終了日（任意）'}
          value={endsOn ?? startsOn}
          onChange={setEndsOn}
          clearable={!isBulk && endsOn !== null}
          onClear={() => setEndsOn(null)}
        />
        {!isBulk && endsOn === null ? (
          <Text
            variant="bodySmall"
            style={[styles.tight, { color: theme.colors.onSurfaceVariant }]}
          >
            終了日なし（解除するまで続きます）
          </Text>
        ) : null}
        {isBulk && endsOn === null ? (
          <Text
            variant="bodySmall"
            style={[styles.tight, { color: theme.colors.error }]}
          >
            まとめて追加するには終了日が必要です
          </Text>
        ) : null}

        <Text
          variant="labelMedium"
          style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          {isSavings ? '積立先の目標' : 'カテゴリ'}
        </Text>
        {isSavings ? (
          <GoalPicker
            goals={goals.data ?? []}
            savedByGoal={new Map((goals.data ?? []).map((g) => [g.id, g.saved]))}
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

        {!isBulk ? (
          <>
        <Divider style={styles.divider} />

        <List.Item
          title="自動で家計簿に反映する"
          description={
            autoPost
              ? '期日が来たら自動で記録します'
              : '期日が来たらホーム画面で確認してから記録します'
          }
          right={() => <Switch value={autoPost} onValueChange={setAutoPost} />}
          style={styles.listItem}
        />

        <Text
          variant="labelMedium"
          style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
        >
          事前通知
        </Text>
        <View style={styles.notifyRow}>
          {NOTIFY_OPTIONS.map((option) => {
            const active = notifyDaysBefore === option.value;
            return (
              <TouchableRipple
                key={String(option.value)}
                onPress={() => setNotifyDaysBefore(option.value)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: active
                      ? theme.colors.primaryContainer
                      : 'transparent',
                    borderColor: active
                      ? theme.colors.primary
                      : theme.colors.outlineVariant,
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
                  {option.label}
                </Text>
              </TouchableRipple>
            );
          })}
        </View>
          </>
        ) : null}

        <View style={styles.gap} />
        <TextField
          resetKey={`memo-${formKey}`}
          initialValue={memo}
          mode="outlined"
          label="メモ（任意）"
          onChangeText={setMemo}
        />

        {isBulk ? (
          <Button
            mode="contained"
            icon="calendar-multiple"
            onPress={() => {
              Keyboard.dismiss();
              setBulkConfirm(true);
            }}
            disabled={!canBulk || !canSave}
            loading={saving}
            style={styles.save}
            contentStyle={styles.saveContent}
          >
            {bulk.dates.length > 0
              ? `${bulk.dates.length}件をまとめて追加`
              : 'まとめて追加'}
          </Button>
        ) : (
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
        )}

        {isEditing ? (
          <Button
            textColor={theme.colors.error}
            onPress={() => setConfirmDelete(true)}
            style={styles.delete}
          >
            この固定費を削除
          </Button>
        ) : null}
      </ScrollView>

      <OptionGridDialog
        visible={dayPicker}
        title={kind === 'weekly' ? '曜日を選ぶ' : '日を選ぶ'}
        options={dayOptions}
        value={day}
        columns={7}
        footnote={
          kind === 'weekly'
            ? undefined
            : '31 を選ぶと「月末」扱いになり、2月や30日までの月は月末に繰り上がります。'
        }
        onSelect={(v) => {
          setDay(v);
          setDayPicker(false);
        }}
        onDismiss={() => setDayPicker(false)}
      />

      <OptionGridDialog
        visible={monthPicker}
        title="月を選ぶ"
        options={Array.from({ length: 12 }, (_, i) => ({
          value: i + 1,
          label: String(i + 1),
        }))}
        value={month}
        columns={4}
        onSelect={(v) => {
          setMonth(v);
          setMonthPicker(false);
        }}
        onDismiss={() => setMonthPicker(false)}
      />

      <Portal>
        {/* まとめて追加は取り消しが効かないので、件数と期間を見せて確認を取る */}
        <Dialog visible={bulkConfirm} onDismiss={() => setBulkConfirm(false)}>
          <Dialog.Title>{bulk.dates.length}件をまとめて追加</Dialog.Title>
          <Dialog.Content style={styles.confirmContent}>
            <Text variant="bodyMedium">
              {bulk.dates.length > 0
                ? `${formatDateMedium(bulk.dates[0])} 〜 ${formatDateMedium(
                    bulk.dates[bulk.dates.length - 1],
                  )} の該当日に、${formatYen(amount ?? 0)} の${
                    type === 'income' ? '収入' : '支出'
                  }を記録します。`
                : ''}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              追加後は通常の記録として扱われます。まとめて取り消すことはできないため、
              間違えた場合は履歴から1件ずつ削除してください。
            </Text>
            {bulk.truncated ? (
              <Text variant="bodySmall" style={{ color: theme.colors.error }}>
                期間が長すぎるため、上限の{MAX_OCCURRENCES}件までに絞られています。
                期間を分けて追加してください。
              </Text>
            ) : null}
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setBulkConfirm(false)}>キャンセル</Button>
            <Button
              mode="contained"
              loading={saving}
              disabled={saving}
              onPress={() => void handleBulkCreate()}
            >
              追加する
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={bulkDone !== null} onDismiss={() => router.back()}>
          <Dialog.Title>追加しました</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {bulkDone}件を記録しました。履歴から確認できます。
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button mode="contained" onPress={() => router.back()}>
              閉じる
            </Button>
          </Dialog.Actions>
        </Dialog>

        <Dialog visible={confirmDelete} onDismiss={() => setConfirmDelete(false)}>
          <Dialog.Title>この固定費を削除しますか</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              これまでに自動で記録された取引は残ります。今後の自動記録だけが止まります。
            </Text>
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
    </View>
    </Portal.Host>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: 48 },
  gap: { height: spacing.md },
  modeBlock: { gap: spacing.sm, marginBottom: spacing.lg },
  sectionLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  selectorRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  selector: { flex: 1, borderRadius: radius.md, borderWidth: 1 },
  selectorInner: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: 2,
  },
  selectorValue: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  tight: { marginTop: -spacing.sm, marginBottom: spacing.sm },
  divider: { marginVertical: spacing.lg },
  listItem: { paddingHorizontal: 0 },
  notifyRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
  },
  save: { marginTop: spacing.xl, borderRadius: radius.md },
  saveContent: { paddingVertical: spacing.sm },
  delete: { marginTop: spacing.sm },
  confirmContent: { gap: spacing.sm },
});
