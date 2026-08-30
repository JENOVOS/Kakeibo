import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Button,
  Dialog,
  Divider,
  List,
  Portal,
  Snackbar,
  Text,
} from 'react-native-paper';
import { useTheme } from 'react-native-paper';
import { ScreenHeader } from '@/components/ScreenHeader';
import Constants from 'expo-constants';
import { AppCard } from '@/components/AppCard';
import { TextField } from '@/components/TextField';
import { useDbQuery } from '@/hooks/useDbQuery';
import { useTabBarPadding } from '@/hooks/useTabBarPadding';
import {
  describeRange,
  exportCsv,
  exportJson,
  importJson,
  wipeAll,
} from '@/repositories/backup';
import { countActive } from '@/repositories/recurrings';
import { countActive as countGoals } from '@/repositories/savings';
import { THEME_LABELS, useThemeStore, type ThemeMode } from '@/stores/useThemeStore';
import { useEntitlement } from '@/stores/useEntitlement';
import { countAll } from '@/repositories/transactions';
import { KEYS, get as getSetting, set as setSetting } from '@/repositories/settings';
import {
  ensurePermission,
  rescheduleRecurringReminders,
} from '@/services/notifications';

const NOTIFY_TIMES = ['07:00', '08:00', '09:00', '12:00', '18:00', '20:00', '21:00'];

export default function SettingsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const bottomPadding = useTabBarPadding();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [timeDialog, setTimeDialog] = useState(false);
  const [wipeDialog, setWipeDialog] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [restoreDialog, setRestoreDialog] = useState(false);
  const [themeDialog, setThemeDialog] = useState(false);
  const themeMode = useThemeStore((s) => s.mode);
  const isPro = useEntitlement((s) => s.isPro);
  const setThemeMode = useThemeStore((s) => s.setMode);

  const txCount = useDbQuery(() => countAll(), []);
  const ruleCount = useDbQuery(() => countActive(), []);
  const goalCount = useDbQuery(() => countGoals(), []);
  const range = useDbQuery(() => describeRange(), []);
  const notifyAt = useDbQuery(() => getSetting(KEYS.notifyAt), []);
  const lastBackup = useDbQuery(() => getSetting(KEYS.lastBackupAt), []);

  async function run(label: string, fn: () => Promise<string>) {
    setBusy(label);
    try {
      setMessage(await fn());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : '処理に失敗しました');
    } finally {
      setBusy(null);
    }
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScreenHeader showMonthNav={false} title="設定" subtitle="管理とデータ" />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomPadding }]}>

        {/* 管理 ----------------------------------------------------- */}
        <AppCard padded={false} style={styles.tight}>
          <List.Item
            title="カテゴリ"
            description="支出・収入の分類を編集する"
            left={(p) => <List.Icon {...p} icon="shape-outline" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => router.push('/categories')}
          />
          <Divider />
          <List.Item
            title="固定費・定期収入"
            description={`${ruleCount.data ?? 0}件が有効`}
            left={(p) => <List.Icon {...p} icon="autorenew" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => router.push('/recurring')}
          />
          <Divider />
          <List.Item
            title="貯金の目標"
            description={isPro ? `${goalCount.data ?? 0}件` : '買い切りで解放'}
            left={(p) => <List.Icon {...p} icon="piggy-bank-outline" />}
            right={(p) => (
              <List.Icon {...p} icon={isPro ? 'chevron-right' : 'lock'} />
            )}
            onPress={() => router.push(isPro ? '/savings' : '/pro')}
          />
          <Divider />
          <List.Item
            title="年間レポート"
            description="月ごとの推移とカテゴリ内訳"
            left={(p) => <List.Icon {...p} icon="chart-bar" />}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => router.push('/report')}
          />
        </AppCard>

        {/* 買い切り --------------------------------------------------- */}
        <AppCard padded={false} style={styles.tight}>
          <List.Item
            title={isPro ? 'ご購入ありがとうございます' : 'すべての機能を解放'}
            description={
              isPro
                ? '貯金機能が使え、広告は表示されません'
                : '貯金機能の解放と広告の非表示（買い切り）'
            }
            left={(p) => (
              <List.Icon
                {...p}
                icon={isPro ? 'check-decagram' : 'star-four-points'}
              />
            )}
            right={(p) => <List.Icon {...p} icon="chevron-right" />}
            onPress={() => router.push('/pro')}
          />
        </AppCard>

        {/* 表示 ----------------------------------------------------- */}
        <AppCard title="表示" padded={false}>
          <List.Item
            title="テーマ"
            description={THEME_LABELS[themeMode]}
            left={(p) => <List.Icon {...p} icon="palette-outline" />}
            onPress={() => setThemeDialog(true)}
          />
        </AppCard>

        {/* 通知 ----------------------------------------------------- */}
        <AppCard title="通知" padded={false}>
          <List.Item
            title="通知を許可する"
            description="固定費の発生前にお知らせします"
            left={(p) => <List.Icon {...p} icon="bell-outline" />}
            onPress={() =>
              void run('notify', async () => {
                const granted = await ensurePermission();
                if (!granted) return '通知が許可されませんでした';
                const n = await rescheduleRecurringReminders();
                return `${n}件の通知を予約しました`;
              })
            }
          />
          <Divider />
          <List.Item
            title="通知する時刻"
            description={notifyAt.data ?? '09:00'}
            left={(p) => <List.Icon {...p} icon="clock-outline" />}
            onPress={() => setTimeDialog(true)}
          />
        </AppCard>

        {/* バックアップ ---------------------------------------------- */}
        <AppCard
          title="バックアップ"
          subtitle="データは端末内にのみ保存されます"
          padded={false}
        >
          <Text variant="bodySmall" style={styles.warning}>
            このアプリはサーバーにデータを送りません。そのぶん、機種変更や端末の紛失に備えて自分でバックアップを取る必要があります。
          </Text>
          <List.Item
            title="バックアップを書き出す"
            description={
              lastBackup.data
                ? `前回: ${new Date(lastBackup.data).toLocaleString('ja-JP')}`
                : 'まだ書き出していません'
            }
            left={(p) => <List.Icon {...p} icon="cloud-upload-outline" />}
            onPress={() =>
              void run('export', async () => {
                const { count } = await exportJson();
                return `${count}件を書き出しました`;
              })
            }
          />
          <Divider />
          <List.Item
            title="CSV で書き出す"
            description="Excel や Numbers で開けます"
            left={(p) => <List.Icon {...p} icon="file-delimited-outline" />}
            onPress={() =>
              void run('csv', async () => {
                const { count } = await exportCsv();
                return `${count}件を CSV に書き出しました`;
              })
            }
          />
          <Divider />
          <List.Item
            title="バックアップから復元する"
            description={
              range.data
                ? `現在のデータ: ${txCount.data ?? 0}件（${range.data}）`
                : `現在のデータ: ${txCount.data ?? 0}件`
            }
            left={(p) => <List.Icon {...p} icon="cloud-download-outline" />}
            onPress={() => setRestoreDialog(true)}
          />
        </AppCard>

        {/* 危険な操作 ------------------------------------------------ */}
        <AppCard padded={false} style={styles.tight}>
          <List.Item
            title="すべてのデータを削除"
            titleStyle={{ color: theme.colors.error }}
            left={(p) => <List.Icon {...p} icon="delete-outline" color={theme.colors.error} />}
            onPress={() => {
              setWipeConfirmText('');
              setWipeDialog(true);
            }}
          />
        </AppCard>

        <Text variant="bodySmall" style={styles.version}>
          {Constants.expoConfig?.name ?? '家計簿'} v
          {Constants.expoConfig?.version ?? '1.0.0'}
        </Text>

        {busy ? <ActivityIndicator style={styles.busy} /> : null}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <Portal>
        <Dialog visible={themeDialog} onDismiss={() => setThemeDialog(false)}>
          <Dialog.Title>テーマ</Dialog.Title>
          <Dialog.Content>
            {(['light', 'dark', 'system'] as ThemeMode[]).map((mode) => (
              <List.Item
                key={mode}
                title={THEME_LABELS[mode]}
                onPress={() =>
                  void (async () => {
                    await setThemeMode(mode);
                    setThemeDialog(false);
                  })()
                }
                right={() =>
                  themeMode === mode ? <List.Icon icon="check" /> : null
                }
              />
            ))}
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* 通知時刻 ------------------------------------------------- */}
      <Portal>
        <Dialog visible={timeDialog} onDismiss={() => setTimeDialog(false)}>
          <Dialog.Title>通知する時刻</Dialog.Title>
          <Dialog.Content>
            {NOTIFY_TIMES.map((time) => (
              <List.Item
                key={time}
                title={time}
                onPress={() =>
                  void (async () => {
                    await setSetting(KEYS.notifyAt, time);
                    await rescheduleRecurringReminders().catch(() => undefined);
                    setTimeDialog(false);
                  })()
                }
                right={() =>
                  (notifyAt.data ?? '09:00') === time ? (
                    <List.Icon icon="check" />
                  ) : null
                }
              />
            ))}
          </Dialog.Content>
        </Dialog>

        {/* 復元の確認 ---------------------------------------------- */}
        <Dialog visible={restoreDialog} onDismiss={() => setRestoreDialog(false)}>
          <Dialog.Title>バックアップから復元</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              いま端末にあるデータ（{txCount.data ?? 0}件）はすべて置き換えられます。この操作は取り消せません。
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setRestoreDialog(false)}>キャンセル</Button>
            <Button
              onPress={() => {
                setRestoreDialog(false);
                void run('import', async () => {
                  const result = await importJson();
                  if (result.status === 'canceled') return '復元をキャンセルしました';
                  await rescheduleRecurringReminders().catch(() => undefined);
                  return `${result.counts?.transactions ?? 0}件を復元しました`;
                });
              }}
            >
              ファイルを選ぶ
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* 全消去の確認 -------------------------------------------- */}
        <Dialog visible={wipeDialog} onDismiss={() => setWipeDialog(false)}>
          <Dialog.Title>すべてのデータを削除</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.wipeText}>
              取引・予算・固定費・カテゴリをすべて削除します。復元はできません。続けるには「削除」と入力してください。
            </Text>
            <TextField
              resetKey={wipeDialog ? 'open' : 'closed'}
              mode="outlined"
              onChangeText={setWipeConfirmText}
              placeholder="削除"
              autoCapitalize="none"
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setWipeDialog(false)}>キャンセル</Button>
            <Button
              textColor={theme.colors.error}
              disabled={wipeConfirmText.trim() !== '削除'}
              onPress={() => {
                setWipeDialog(false);
                void run('wipe', async () => {
                  await wipeAll();
                  return 'すべてのデータを削除しました';
                });
              }}
            >
              削除
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={message !== null}
        onDismiss={() => setMessage(null)}
        duration={4000}
      >
        {message ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: 16, paddingBottom: 24 },

  tight: { paddingVertical: 4 },
  warning: { opacity: 0.75, paddingHorizontal: 16, paddingBottom: 8 },
  version: { opacity: 0.5, textAlign: 'center', marginTop: 8 },
  busy: { marginTop: 16 },
  wipeText: { marginBottom: 12 },
  bottomSpacer: { height: 24 },
});
