# リリース手順

App Store と Google Play への公開に必要な作業。Windows から完結できる。

## 1. 事前に必要なもの

| 項目 | 費用 | 備考 |
|---|---|---|
| Apple Developer Program | **$99 / 年** | 個人なら Apple ID のみ。法人は D-U-N-S 番号が必要 |
| Google Play Developer | **$25 買い切り** | 個人アカウントは本人確認あり |
| Expo アカウント | 無料 | EAS Build の無料枠あり |
| AdMob アカウント | 無料 | 広告を出す場合。支払い情報の登録が要る |
| プライバシーポリシーの URL | — | 両ストア必須。次項参照 |

## 2. リリース前に必ず直すもの

### バンドル ID / パッケージ名

`app.json` の以下2箇所が `com.example.kakeibo` のままになっている。

```json
"ios":     { "bundleIdentifier": "com.example.kakeibo" }
"android": { "package":          "com.example.kakeibo" }
```

自分のドメインを逆順にしたもの（例 `com.yourname.kakeibo`）へ変更する。
**一度ストアに登録すると二度と変更できない。**

### アプリ名

`app.json` の `"name": "家計簿"` はストアでの表示名になる。
「家計簿」は一般名詞なので既存アプリと重複しやすい。固有の名前を付けることを勧める。

### アイコンとスプラッシュ

`assets/` にテンプレートの既定画像が入っている。差し替えること。

アイコンは `npm run icons` で `assets/icon-source.svg` の意匠から書き出される。
差し替えるときは SVG を直してコマンドを流すこと。

| ファイル | 用途 | サイズ |
|---|---|---|
| `icon.png` | iOS アプリアイコン | 1024×1024（**アルファなし**。あると弾かれる） |
| `android-icon-foreground.png` | Android アダプティブアイコン前景 | 432×432 |
| `android-icon-background.png` | 同 背景 | 432×432 |
| `android-icon-monochrome.png` | 同 モノクロ（テーマアイコン用）。通知アイコンにも使用 | 432×432 |
| `splash-icon.png` | 起動画面 | 1284×2778 程度 |

## 3. プライバシー関連

> **広告を入れたことで前提が変わっている。**
> 家計簿の中身（取引・予算・貯金）は端末内にしか無いが、
> 広告SDKは配信のために端末識別子を Google に送る。
> 以下はその前提で書き直したもの。詳細は [06-monetization.md](./06-monetization.md)。

### プライバシーポリシー

**URL の掲示は両ストアで必須**。GitHub Pages や Notion の公開ページでよい。
広告を入れたので、最低限これだけは書く。

- 家計簿のデータ（取引・予算・固定費・貯金）: 端末内にのみ保存。外部送信しない
- 広告配信のため、Google AdMob が**広告識別子などの端末情報を取得する**こと
- AdMob のプライバシーポリシーへのリンク
- 購入情報は Apple / Google が扱い、当方のサーバーには送られないこと
- 利用者による削除方法（アプリ内の「すべてのデータを削除」）
- 問い合わせ先

### Apple: プライバシーマニフェスト

`app.json` に設定済み（`ios.privacyManifests`）。
`expo-file-system` などが使う API について、理由コードを申告している。

| API カテゴリ | 理由コード | 意味 |
|---|---|---|
| FileTimestamp | `C617.1` | アプリ自身が作成したファイルのタイムスタンプ参照 |
| UserDefaults | `CA92.1` | アプリ自身の設定の読み書き |
| DiskSpace | `E174.1` | 書き込み前の空き容量確認 |

**広告のぶんの申告を足すこと。** AdMob は識別子とデバイス情報を扱うため、
`NSPrivacyCollectedDataTypes` に「デバイスID」「利用データ」等の申告が要る。
`SKAdNetworkItems` は広告SDKのプラグインが自動で入れる。

**ATT（トラッキングの許可）** の説明文は `app.json` に設定済み。
起動処理の最後、画面が見えたあとに出るようにしてある
（起動直後に出すと拒否されやすく、審査でも文脈のない表示を嫌われる）。

### Apple: 暗号化の申告

`ITSAppUsesNonExemptEncryption: false` を設定済み。
HTTPS も含めた通信を行わないため、提出のたびに輸出コンプライアンスの質問に
答える必要がなくなる。

### Google Play: データセーフティ

**「収集なし」では申告できなくなった。** 広告SDKぶんを正しく申告する。

- 家計簿のデータ: 収集なし（端末内のみ）
- 広告ID / おおよその位置情報・デバイス情報: **収集・共有あり（広告目的）**
- データの暗号化: 転送時に暗号化される（AdMob 側）
- データ削除のリクエスト: アプリ内の「すべてのデータを削除」で可能
- 広告が含まれるアプリとして申告する

## 4. ビルドと提出

```bash
npm install -g eas-cli
eas login
eas build:configure
```

### ビルド

```bash
# 両プラットフォームを一度に
npx eas build --profile production --platform all

# 片方ずつ
npx eas build --profile production --platform ios
npx eas build --profile production --platform android
```

`eas.json` の `production` プロファイルは `autoIncrement: true` にしてあるので、
ビルド番号（iOS の buildNumber / Android の versionCode）は自動で上がる。
`app.json` の `version`（1.0.0）は、ユーザーに見えるバージョンなので手動で更新する。

iOS の初回ビルドでは Apple ID を訊かれ、証明書とプロビジョニングプロファイルは
EAS が自動生成・管理する。Mac もキーチェーン操作も不要。

### 提出

```bash
npx eas submit --platform ios
npx eas submit --platform android
```

Android の初回だけは、Play Console に AAB を手動で1回アップロードして
アプリを作成しておく必要がある（以降は `eas submit` で完結）。

## 5. ストア掲載情報

### スクリーンショット

Expo に生成機能はないので手動で用意する。

| ストア | 必要なサイズ |
|---|---|
| App Store | iPhone 6.5"（1242×2688）/ 6.7"（1284×2778）/ 6.9"（1290×2796）。`npm run shots` で書き出せる |
| Google Play | スマホ用 2枚以上 + フィーチャーグラフィック 1024×500 |

**iPad 用は不要。** `app.json` の `supportsTablet` を `false` にしてあるため、
13インチ（2064×2752 など）の提出を求められない。
このアプリはタブレット向けのレイアウト調整をしておらず、
iPad では電話用の画面が引き伸ばされるだけなので、対応を謳っていない。

### 説明文で強調すると効くこと

このアプリの差別化点はプライバシーなので、そこを前に出す。

- 家計簿のデータは端末内にのみ保存され、外部サーバーに送信されない
- アカウント登録不要
- 買い切りで広告を消せる（月額ではない）
- 支出と収入を分けて管理、月次・年次の予算設定
- 固定費の自動記録とリマインダー
- JSON / CSV でのバックアップとデータ移行

## 6. 審査で指摘されやすい点

| 指摘 | 対策 |
|---|---|
| 機能が薄い（Minimum Functionality, App Store 4.2） | 予算・固定費・レポートまで実装済みなので通常は問題にならない |
| データ削除手段がない | 「すべてのデータを削除」を設定画面に実装済み |
| プライバシーポリシーの URL が無効 | 提出前にリンクを開いて確認する |
| Play のターゲット API レベル不足 | 提出前に `npx expo install --check` で SDK を上げる必要があるか確認する（Expo Go 互換の縛りは無くなった） |
| 「購入を復元」が無い | `app/pro.tsx` に実装済み。**消さないこと**（非消耗型では必須） |
| 課金商品が取得できない | 税務・銀行情報の未登録が原因のことが多い |
| 広告と課金の申告漏れ | データセーフティ / プライバシーマニフェストを更新すること |
| 通知の許諾を起動直後に求める | 本アプリは設定画面から明示的に求める作りにしてある |

## 7. リリース後

### 軽微な修正は OTA で配れる

```bash
npx eas update --branch production
```

JS の変更（文言、レイアウト、ロジック）はストア審査を通さず配信できる。
ネイティブモジュールの追加・削除、`app.json` のネイティブ設定変更は
再ビルドが必要。

### データ移行の互換性を壊さないこと

バックアップ JSON には `version` が入っている（現在 1）。
スキーマを変更してバックアップ形式が変わる場合は:

1. `BACKUP_VERSION` を上げる
2. 復元側で **古いバージョンも読める** ようにする

古い版のバックアップを読めなくすると、久しぶりに機種変更したユーザーが
データを失う。ここは後方互換を維持する（→ [`src/repositories/backup.ts`](../src/repositories/backup.ts)）。
