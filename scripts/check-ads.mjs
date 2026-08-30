import { readFileSync } from 'node:fs';

/**
 * AdMob の設定を検査する。
 *
 * アプリIDと広告ユニットIDは前半が同じで区切り文字だけが違うため、
 * 取り違えても目視では気づきにくい。しかも間違えたときの症状が重い:
 *   - アプリIDが不正 → iOS は起動直後にクラッシュする
 *   - ユニットIDが未設定 → 本番なのにテスト広告が出て収益がゼロになる
 * どちらもストアに出してから気づくことになるので、提出前に機械で確かめる。
 */

const APP_ID = /^ca-app-pub-\d{16}~\d{10}$/;
const UNIT_ID = /^ca-app-pub-\d{16}\/\d{10}$/;
const PLACEHOLDER = /^ca-app-pub-0{16}[~/]0{10}$/;
/** Google が公開しているテスト用の発行元ID。本番に混ざったまま出荷すると収益がゼロになる */
const GOOGLE_TEST_PUBLISHER = '3940256099942544';

const config = JSON.parse(readFileSync('app.json', 'utf8')).expo;
const adsPlugin = config.plugins.find(
  (p) => Array.isArray(p) && p[0] === 'react-native-google-mobile-ads',
);

const problems = [];
const warnings = [];

function checkAppId(key, value) {
  if (!value || PLACEHOLDER.test(value)) {
    problems.push(`${key}: 未設定（プレースホルダのまま）`);
  } else if (UNIT_ID.test(value)) {
    problems.push(
      `${key}: 広告ユニットID（/ 区切り）が入っている。アプリID（~ 区切り）が必要`,
    );
  } else if (!APP_ID.test(value)) {
    problems.push(`${key}: アプリIDの形式ではない → ${value}`);
  }
}

function checkUnitId(key, value) {
  if (!value) {
    warnings.push(`${key}: 未設定。このプラットフォームはテスト広告のままになる`);
  } else if (APP_ID.test(value)) {
    problems.push(
      `${key}: アプリID（~ 区切り）が入っている。広告ユニットID（/ 区切り）が必要`,
    );
  } else if (!UNIT_ID.test(value)) {
    problems.push(`${key}: 広告ユニットIDの形式ではない → ${value}`);
  }
}

if (!adsPlugin) {
  problems.push('app.json に react-native-google-mobile-ads の設定がない');
} else {
  checkAppId('iosAppId', adsPlugin[1]?.iosAppId);
  checkAppId('androidAppId', adsPlugin[1]?.androidAppId);
}

checkUnitId('extra.admobBannerIos', config.extra?.admobBannerIos);
checkUnitId('extra.admobBannerAndroid', config.extra?.admobBannerAndroid);

// 同じ AdMob アカウントなら発行元（ca-app-pub- に続く16桁）は揃うはず。
// 揃っていなければ、別アカウントのIDが混ざっている可能性がある。
const publishers = new Set(
  [
    adsPlugin?.[1]?.iosAppId,
    adsPlugin?.[1]?.androidAppId,
    config.extra?.admobBannerIos,
    config.extra?.admobBannerAndroid,
  ]
    .filter((v) => v && !PLACEHOLDER.test(v))
    .map((v) => v.slice('ca-app-pub-'.length, 'ca-app-pub-'.length + 16))
    .filter((v) => v !== GOOGLE_TEST_PUBLISHER),
);
if (publishers.size > 1) {
  warnings.push(
    `発行元IDが混在している: ${[...publishers].join(', ')}（別アカウントのIDが混ざっていないか確認）`,
  );
}

// Google のテスト用IDが残っていないか
for (const [key, value] of [
  ['iosAppId', adsPlugin?.[1]?.iosAppId],
  ['androidAppId', adsPlugin?.[1]?.androidAppId],
  ['extra.admobBannerIos', config.extra?.admobBannerIos],
  ['extra.admobBannerAndroid', config.extra?.admobBannerAndroid],
]) {
  if (typeof value === 'string' && value.includes(GOOGLE_TEST_PUBLISHER)) {
    warnings.push(
      `${key}: Google のテスト用IDのまま。このプラットフォームを公開する前に自分のIDへ差し替えること`,
    );
  }
}

for (const w of warnings) console.log(`  警告  ${w}`);
for (const p of problems) console.log(`  エラー ${p}`);

if (problems.length > 0) {
  console.log(`\nAdMob の設定に ${problems.length} 件の問題があります。`);
  process.exit(1);
}
console.log(
  warnings.length > 0
    ? '\nAdMob の設定に致命的な誤りはありません（警告は上記）。'
    : '\nAdMob の設定に問題はありません。',
);
