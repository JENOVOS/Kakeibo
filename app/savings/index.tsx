import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { FAB, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { EmptyState } from '@/components/EmptyState';
import { GoalCard } from '@/components/GoalCard';
import { useDbQuery } from '@/hooks/useDbQuery';
import { useEntitlement } from '@/stores/useEntitlement';
import { list } from '@/repositories/savings';
import { spacing } from '@/theme';

/** 貯金の目標一覧。達成済み・中止したものはアーカイブとして下に分ける */
export default function SavingsListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const isPro = useEntitlement((s) => s.isPro);
  const active = useDbQuery(() => list(false), []);
  const all = useDbQuery(() => list(true), []);
  const archived = (all.data ?? []).filter((g) => g.isArchived);

  const rows = active.data ?? [];

  // 設定などから直接来られた場合の保険。導線側でも鍵をかけている
  if (!isPro) {
    return (
      <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
        <AppCard>
          <EmptyState
            icon="lock"
            title="貯金機能は買い切りの機能です"
            description="目的・目標金額・目標日を決めて積み立てられます。"
            actionLabel="内容を見る"
            onAction={() => router.replace('/pro')}
          />
        </AppCard>
      </View>
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        {rows.length === 0 ? (
          <AppCard>
            <EmptyState
              icon="piggy-bank-outline"
              title="貯金の目標がありません"
              description="目的・目標金額・目標日を決めると、記録画面に貯金枠が出て積み立てられます。"
              actionLabel="目標を作る"
              onAction={() => router.push('/savings/edit')}
            />
          </AppCard>
        ) : (
          rows.map((goal) => (
            <TouchableRipple
              key={goal.id}
              onPress={() =>
                router.push({
                  pathname: '/savings/edit',
                  params: { id: String(goal.id) },
                })
              }
            >
              <AppCard>
                <GoalCard goal={goal} />
              </AppCard>
            </TouchableRipple>
          ))
        )}

        {archived.length > 0 ? (
          <AppCard title="アーカイブ済み" subtitle="記録画面の積立先には出ません">
            {archived.map((goal) => (
              <TouchableRipple
                key={goal.id}
                onPress={() =>
                  router.push({
                    pathname: '/savings/edit',
                    params: { id: String(goal.id) },
                  })
                }
                style={styles.archivedRow}
              >
                <View style={styles.archivedInner}>
                  <Text variant="bodyMedium">{goal.name}</Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {Math.round(goal.ratio * 100)}% 達成
                  </Text>
                </View>
              </TouchableRipple>
            ))}
          </AppCard>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => router.push('/savings/edit')}
        accessibilityLabel="貯金の目標を追加"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingTop: spacing.md, paddingBottom: spacing.xl },
  archivedRow: { paddingVertical: spacing.sm },
  archivedInner: { gap: 2 },
  fab: { position: 'absolute', right: spacing.lg, bottom: spacing.lg },
  bottomSpacer: { height: 72 },
});
