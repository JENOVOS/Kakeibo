import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  Avatar,
  Divider,
  FAB,
  List,
  SegmentedButtons,
  Text,
  useTheme,
} from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import type { CategoryType } from '@/db/schema';
import { useDbQuery } from '@/hooks/useDbQuery';
import { listByType } from '@/repositories/categories';

export default function CategoryListScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [type, setType] = useState<CategoryType>('expense');

  const active = useDbQuery(() => listByType(type, false), [type]);
  const all = useDbQuery(() => listByType(type, true), [type]);
  const archived = (all.data ?? []).filter((c) => c.isArchived);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <View style={styles.switcher}>
        <SegmentedButtons
          value={type}
          onValueChange={(v) => setType(v as CategoryType)}
          density="medium"
          buttons={[
            { value: 'expense', label: '支出' },
            { value: 'income', label: '収入' },
          ]}
        />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <AppCard padded={false}>
          {(active.data ?? []).map((category, index) => (
            <View key={category.id}>
              {index > 0 ? <Divider /> : null}
              <List.Item
                title={category.name}
                onPress={() =>
                  router.push({
                    pathname: '/categories/edit',
                    params: { id: String(category.id) },
                  })
                }
                left={() => (
                  <Avatar.Icon
                    size={40}
                    icon={category.icon}
                    color="#FFFFFF"
                    style={{ backgroundColor: category.color }}
                  />
                )}
                right={() => <List.Icon icon="chevron-right" />}
              />
            </View>
          ))}
        </AppCard>

        {archived.length > 0 ? (
          <AppCard
            title="アーカイブ済み"
            subtitle="新しい記録では選べませんが、過去の記録には残ります"
            padded={false}
          >
            {archived.map((category, index) => (
              <View key={category.id}>
                {index > 0 ? <Divider /> : null}
                <List.Item
                  title={category.name}
                  titleStyle={styles.archived}
                  onPress={() =>
                    router.push({
                      pathname: '/categories/edit',
                      params: { id: String(category.id) },
                    })
                  }
                  left={() => (
                    <Avatar.Icon
                      size={40}
                      icon={category.icon}
                      color="#FFFFFF"
                      style={{
                        backgroundColor: category.color,
                        opacity: 0.4,
                      }}
                    />
                  )}
                />
              </View>
            ))}
          </AppCard>
        ) : null}

        <Text variant="bodySmall" style={styles.note}>
          使われているカテゴリは削除できません。代わりにアーカイブすると、過去の記録を保ったまま新規入力の候補から外せます。
        </Text>
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() =>
          router.push({ pathname: '/categories/edit', params: { type } })
        }
        accessibilityLabel="カテゴリを追加"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  switcher: { padding: 16, paddingBottom: 8 },
  content: { paddingBottom: 24 },
  archived: { opacity: 0.5 },
  note: { opacity: 0.5, paddingHorizontal: 24 },
  fab: { position: 'absolute', right: 16, bottom: 16 },
  bottomSpacer: { height: 72 },
});
