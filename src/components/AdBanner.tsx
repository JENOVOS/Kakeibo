import { useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import {
  BannerAd,
  BannerAdSize,
  TestIds,
} from 'react-native-google-mobile-ads';
import { useEntitlement } from '@/stores/useEntitlement';
import { spacing } from '@/theme';

/**
 * 本番の広告ユニットID。AdMob の管理画面で作って差し替える。
 * ここが未設定のままだと広告は出ない（テストIDにフォールバックする）。
 */
const UNIT_IDS = {
  ios: process.env.EXPO_PUBLIC_ADMOB_BANNER_IOS ?? '',
  android: process.env.EXPO_PUBLIC_ADMOB_BANNER_ANDROID ?? '',
};

/**
 * Expo Go では広告SDKのネイティブ側が無い。
 * 開発中に落ちないよう、開発ビルド以外ではテストIDを使う。
 */
const isStoreBuild =
  Constants.executionEnvironment === ExecutionEnvironment.Standalone;

function unitId(): string {
  const configured = Platform.OS === 'ios' ? UNIT_IDS.ios : UNIT_IDS.android;
  if (!isStoreBuild || !configured) return TestIds.BANNER;
  return configured;
}

/**
 * 画面下部に置くバナー広告。
 *
 * **購入者には何も描かない。** 高さも取らないので、
 * 課金後はレイアウトから広告の存在ごと消える。
 *
 * 読み込みに失敗したときも同様に消す。空の枠が残ると
 * 「壊れている」ようにしか見えないため。
 */
export function AdBanner() {
  const isPro = useEntitlement((s) => s.isPro);
  const [failed, setFailed] = useState(false);

  if (isPro || failed) return null;

  return (
    <View style={styles.wrap}>
      <BannerAd
        unitId={unitId()}
        size={BannerAdSize.ANCHORED_ADAPTIVE_BANNER}
        onAdFailedToLoad={() => setFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.sm },
});
