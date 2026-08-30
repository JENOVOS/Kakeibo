import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import {
  DarkTheme as NavDarkTheme,
  DefaultTheme as NavLightTheme,
  ThemeProvider,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { PaperProvider, Text } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import {
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { db } from '@/db/client';
import { seedIfNeeded } from '@/db/seed';
import migrations from '../drizzle/migrations';
import { postDue } from '@/repositories/recurrings';
import { rescheduleRecurringReminders } from '@/services/notifications';
import { initAds } from '@/services/ads';
import { useEntitlement } from '@/stores/useEntitlement';
import { useThemeStore } from '@/stores/useThemeStore';
import { darkTheme, lightTheme } from '@/theme';

/**
 * 起動シーケンス
 *   1. マイグレーション（端末内 SQLite のスキーマを最新に）
 *   2. 初回のみ既定カテゴリを投入
 *   3. 期日を過ぎた固定費を計上
 *   4. 固定費のローカル通知を組み直す
 *
 * 3 と 4 は起動のたびに実行する。重複生成はユニーク索引で防いでいるため冪等。
 */
export default function RootLayout() {
  const scheme = useColorScheme();
  const themeMode = useThemeStore((s) => s.mode);
  // 既定はライト。ダークは設定から明示的に選んだときだけ（→ useThemeStore）
  const isDark = themeMode === 'dark' || (themeMode === 'system' && scheme === 'dark');
  const theme = isDark ? darkTheme : lightTheme;
  const { success, error } = useMigrations(db, migrations);
  const [ready, setReady] = useState(false);

  // 金額表示に使う数値書体。日本語は端末の既定フォントに任せる（→ src/theme）
  const [fontsLoaded, fontError] = useFonts({
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  /**
   * React Navigation は Paper とは別のテーマを持っている。
   * 接続しないと、画面の下地だけが常にライト（白）のまま描かれ、
   * ダークモードでは「白背景に明るい文字」で内容が読めなくなる。
   */
  const navigationTheme: NavTheme = {
    ...(isDark ? NavDarkTheme : NavLightTheme),
    dark: isDark,
    colors: {
      ...(isDark ? NavDarkTheme : NavLightTheme).colors,
      primary: theme.colors.primary,
      background: theme.colors.background,
      card: theme.colors.surface,
      text: theme.colors.onSurface,
      border: theme.colors.outlineVariant,
      notification: theme.colors.error,
    },
  };

  useEffect(() => {
    if (!success) return;
    let cancelled = false;

    (async () => {
      await seedIfNeeded();
      await useThemeStore.getState().hydrate();
      await postDue();
      // 通知は失敗しても本体の利用を妨げない
      await rescheduleRecurringReminders().catch(() => undefined);
      // 課金の照会は通信を伴うので、失敗しても起動は止めない
      await useEntitlement.getState().hydrate().catch(() => undefined);

      if (cancelled) return;
      setReady(true);

      // 広告は購入者には出さないので、SDK の初期化ごと省く。
      // ATT のダイアログも、画面が見えたあとに出るよう最後に回している
      // （起動直後に出すと拒否されやすく、審査でも文脈のない表示を嫌われる）。
      if (!useEntitlement.getState().isPro) {
        await initAds().catch(() => undefined);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [success]);

  if (error) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.background }]}
      >
        <Text variant="titleMedium" style={{ color: theme.colors.onBackground }}>
          データベースの初期化に失敗しました
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.errorDetail, { color: theme.colors.onSurfaceVariant }]}
        >
          {error.message}
        </Text>
      </View>
    );
  }

  // 書体の読み込みに失敗しても既定フォントで動くので、待ちはするが止めはしない
  if (!success || !ready || (!fontsLoaded && !fontError)) {
    return (
      <View
        style={[styles.center, { backgroundColor: theme.colors.background }]}
      >
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <PaperProvider theme={theme}>
          <ThemeProvider value={navigationTheme}>
            <StatusBar style={isDark ? 'light' : 'dark'} />
            <Stack
              screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: theme.colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" />
              <Stack.Screen
                name="entry"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="categories/index"
                options={{ headerShown: true, title: 'カテゴリ' }}
              />
              <Stack.Screen
                name="categories/edit"
                options={{
                  headerShown: true,
                  title: 'カテゴリの編集',
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="recurring/index"
                options={{ headerShown: true, title: '固定費・定期収入' }}
              />
              <Stack.Screen
                name="recurring/edit"
                options={{
                  headerShown: true,
                  title: '固定費の設定',
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="pro"
                options={{ presentation: 'modal', headerShown: false }}
              />
              <Stack.Screen
                name="savings/index"
                options={{ headerShown: true, title: '貯金の目標' }}
              />
              <Stack.Screen
                name="savings/edit"
                options={{
                  headerShown: true,
                  title: '貯金の目標',
                  presentation: 'modal',
                }}
              />
              <Stack.Screen
                name="report"
                options={{ headerShown: true, title: '年間レポート' }}
              />
            </Stack>
          </ThemeProvider>
        </PaperProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorDetail: { marginTop: 8, textAlign: 'center' },
});
