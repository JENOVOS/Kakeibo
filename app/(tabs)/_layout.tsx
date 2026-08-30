import { Tabs } from 'expo-router';
import { TabBar } from '@/components/TabBar';

/**
 * タブ構成は従来どおり4つ。見た目だけモックに合わせ、
 * 中央の記録ボタンを含むバーは TabBar が描く。
 */
export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tabs.Screen name="index" options={{ title: 'ホーム' }} />
      <Tabs.Screen name="history" options={{ title: '履歴' }} />
      <Tabs.Screen name="budget" options={{ title: '予算' }} />
      <Tabs.Screen name="settings" options={{ title: '設定' }} />
    </Tabs>
  );
}
