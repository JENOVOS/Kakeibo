import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { subDays } from 'date-fns';
import { formatYen } from '@/domain/money';
import { fromIso } from '@/domain/period';
import { listActive } from '@/repositories/recurrings';
import { KEYS, get as getSetting } from '@/repositories/settings';

/**
 * 通知はすべて端末内で完結するローカル通知。プッシュサーバーは使わない。
 * 予定は固定費の規則から毎回組み直す（差分更新はズレの温床になるため全消し→再登録）。
 */

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

const CHANNEL_ID = 'recurring-reminders';
const DEFAULT_NOTIFY_AT = '09:00';

export async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: '固定費のリマインド',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 200],
      lightColor: '#4C6EF5',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function parseTimeOfDay(raw: string | null): { hour: number; minute: number } {
  const value = raw ?? DEFAULT_NOTIFY_AT;
  const [h, m] = value.split(':').map(Number);
  return {
    hour: Number.isFinite(h) ? h : 9,
    minute: Number.isFinite(m) ? m : 0,
  };
}

/**
 * 有効な固定費のうち notifyDaysBefore が設定されているものについて、
 * 次回発生日の N 日前に通知を1件だけ積む。
 * 発生のたびに nextDueOn が前進し、アプリ起動時に再登録されるので取りこぼさない。
 */
export async function rescheduleRecurringReminders(): Promise<number> {
  const granted = await Notifications.getPermissionsAsync();
  if (!granted.granted) return 0;

  await Notifications.cancelAllScheduledNotificationsAsync();

  const { hour, minute } = parseTimeOfDay(await getSetting(KEYS.notifyAt));
  const rules = await listActive();
  const now = new Date();
  let scheduled = 0;

  for (const rule of rules) {
    if (rule.notifyDaysBefore === null) continue;

    const due = fromIso(rule.nextDueOn);
    const fireAt = subDays(due, rule.notifyDaysBefore);
    fireAt.setHours(hour, minute, 0, 0);

    // 過去の日時は OS が即時発火させてしまうので積まない
    if (fireAt <= now) continue;

    const whenLabel =
      rule.notifyDaysBefore === 0
        ? '今日'
        : `${rule.notifyDaysBefore}日後`;

    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${rule.name} の${rule.type === 'income' ? '入金' : '引き落とし'}`,
        body: `${whenLabel}に ${formatYen(rule.amount)} の予定です`,
        data: { recurringId: rule.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        ...(Platform.OS === 'android' ? { channelId: CHANNEL_ID } : {}),
      },
    });
    scheduled += 1;
  }

  return scheduled;
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}
