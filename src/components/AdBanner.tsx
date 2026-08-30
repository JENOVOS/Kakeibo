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
 * 広告ユニットIDは app.json の extra に置いている。
 *
 * AdMob のIDは秘密情報ではない（アプリのバイナリに埋め込まれ、誰でも取り出せる）。
 * .env に置くと gitignore されるため、別の環境でクローンしたときに黙って欠落し、
 * 本番ビルドにテスト広告が載ったまま出荷される事故が起きる。
 * バージョン管理下に置いて、欠けていれば気づけるようにしてある。
 */
const extra = Constants.expoConfig?.extra ?? {};

const UNIT_IDS: Record<'ios' | 'android', string> = {
  ios: typeof extra.admobBannerIos === 'string' ? extra.admobBannerIos : '',
  android:
    typeof extra.admobBannerAndroid === 'string' ? extra.admobBannerAndroid : '',
};

/**
 * 広告ユニットIDの形かどうか。
 *
 * AdMob には似た形のIDが2種類あり、区切り文字だけが違う。
 *   アプリID       ca-app-pub-<16桁>~<10桁>   ← app.json のプラグイン設定へ
 *   広告ユニットID ca-app-pub-<16桁>/<10桁>   ← こちら
 * 取り違えても型では気づけないので、実行時に形を確かめる。
 */
function isUnitId(id: string): boolean {
  return /^ca-app-pub-\d{16}\/\d{10}$/.test(id);
}

const isStoreBuild =
  Constants.executionEnvironment === ExecutionEnvironment.Standalone;

function unitId(): string {
  const configured = Platform.OS === 'ios' ? UNIT_IDS.ios : UNIT_IDS.android;

  // 未設定・形が違う・ストアビルドでない、のいずれでもテスト広告にする。
  // 本番IDで自分の広告をタップすると規約違反でアカウントが止まるため、
  // 「迷ったらテスト広告」に倒すのが安全側。
  if (!isStoreBuild || !isUnitId(configured)) {
    if (__DEV__ && configured && !isUnitId(configured)) {
      console.warn(
        `[AdBanner] 広告ユニットIDの形が正しくありません: ${configured}\n` +
          'アプリID（~ 区切り）を入れていないか確認してください。',
      );
    }
    return TestIds.BANNER;
  }
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
