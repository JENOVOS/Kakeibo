import { Platform } from 'react-native';
import mobileAds, { MaxAdContentRating } from 'react-native-google-mobile-ads';
import {
  getTrackingPermissionsAsync,
  requestTrackingPermissionsAsync,
} from 'expo-tracking-transparency';

/**
 * 広告SDKの初期化。
 *
 * iOS でパーソナライズ広告を出すには、IDFA の利用許可（ATT）を
 * 先に取る必要がある。許可しなくても広告は出る（精度が落ちるだけ）ので、
 * 拒否されても機能は一切制限しない。
 *
 * ATT のダイアログは起動直後に出すと拒否されやすいうえ、
 * Apple の審査でも「文脈なく出す」ことを嫌われる。
 * 呼び出し側で、アプリの中身が一度見えたあとに呼ぶこと。
 */
export async function initAds(): Promise<void> {
  if (Platform.OS === 'ios') {
    const current = await getTrackingPermissionsAsync();
    if (current.status === 'undetermined') {
      await requestTrackingPermissionsAsync();
    }
  }

  await mobileAds().setRequestConfiguration({
    // 家計簿アプリなので全年齢向けの内容に絞る
    maxAdContentRating: MaxAdContentRating.G,
    tagForChildDirectedTreatment: false,
    tagForUnderAgeOfConsent: false,
  });

  await mobileAds().initialize();
}
