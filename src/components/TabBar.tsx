import type { ComponentProps } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fabShadow, headerGradient, radius, spacing } from '@/theme';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const ICONS: Record<string, IconName> = {
  index: 'home-variant',
  history: 'format-list-bulleted',
  budget: 'wallet-outline',
  settings: 'cog-outline',
};

/**
 * 中央に記録ボタンを持つタブバー（モック準拠）。
 *
 * 既定のタブバーではなく自前で描いているのは、モックの
 * 「タブの列の中央に、一段持ち上がった丸い + がある」形を出すため。
 * 記録は他のどの操作よりも回数が多いので、親指の届く中央に置く価値がある。
 *
 * ルーティングには手を入れず、navigation の state をそのまま使う。
 * タブ構成（ホーム/履歴/予算/設定）は既存のまま。
 */
export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // 4つのタブを中央ボタンの左右に2つずつ振り分ける
  const half = Math.ceil(state.routes.length / 2);

  const renderTab = (routeIndex: number) => {
    const route = state.routes[routeIndex];
    if (!route) return null;
    const focused = state.index === routeIndex;
    const { options } = descriptors[route.key];
    const label =
      typeof options.title === 'string' ? options.title : route.name;
    const color = focused ? theme.colors.primary : theme.colors.onSurfaceVariant;

    return (
      <TouchableRipple
        key={route.key}
        style={styles.tab}
        borderless
        accessibilityRole="button"
        accessibilityState={{ selected: focused }}
        accessibilityLabel={label}
        onPress={() => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!focused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        }}
      >
        <View style={styles.tabInner}>
          <MaterialCommunityIcons
            name={ICONS[route.name] ?? 'circle-outline'}
            size={22}
            color={color}
          />
          <Text variant="labelSmall" style={[styles.label, { color }]}>
            {label}
          </Text>
        </View>
      </TouchableRipple>
    );
  };

  return (
    <View
      style={[
        styles.bar,
        {
          paddingBottom: insets.bottom || spacing.md,
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outlineVariant,
        },
      ]}
    >
      {Array.from({ length: half }, (_, i) => renderTab(i))}

      <View style={styles.center}>
        <TouchableRipple
          onPress={() => router.push('/entry')}
          style={[styles.fab, fabShadow]}
          borderless
          accessibilityRole="button"
          accessibilityLabel="記録する"
        >
          <LinearGradient
            colors={[headerGradient[0], headerGradient[1]]}
            start={{ x: 0.15, y: 0 }}
            end={{ x: 0.85, y: 1 }}
            style={styles.fabInner}
          >
            <MaterialCommunityIcons name="plus" size={26} color="#FFFFFF" />
          </LinearGradient>
        </TouchableRipple>
      </View>

      {Array.from({ length: state.routes.length - half }, (_, i) =>
        renderTab(half + i),
      )}
    </View>
  );
}

const FAB_SIZE = 54;

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: 11,
    // 中央ボタンがはみ出すぶんを描画できるようにする
    ...Platform.select({ android: { elevation: 0 } }),
  },
  tab: { flex: 1, borderRadius: radius.md },
  tabInner: { alignItems: 'center', gap: 5, paddingVertical: 2 },
  label: { fontSize: 9.5, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center' },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    marginTop: -16,
  },
  fabInner: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
