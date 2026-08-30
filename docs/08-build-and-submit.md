# ビルドと提出（iOS）

App Store Connect の「ビルドを選択してください」を解消するには、
実際にビルドしてアップロードする必要がある。Windows から完結できる。

## 前提

| 項目 | 状態 |
|---|---|
| Apple Developer Program | **必須**（$99/年）。未加入だとビルドの署名ができない |
| バンドルID | `com.jenovos.kakeibo`（App Store Connect の登録と一致させてある） |
| Expo アカウント | 無料。EAS Build の無料枠で足りる |
| Mac | **不要**。EAS のクラウド Mac がビルドする |

事前チェックは通っている。

```
expo-doctor        18/18 通過
アイコン           1024×1024・アルファなし（App Store の要件を満たす）
AdMob iOS          アプリID・バナーとも設定済み
プライバシー       privacyManifests / ITSAppUsesNonExemptEncryption 設定済み
```

## 手順

### 1. ログインとプロジェクトの紐付け

```bash
npx eas-cli login
```

```bash
npx eas-cli init
```

`init` は Expo 側にプロジェクトを作り、`app.json` に
`extra.eas.projectId` を書き込む。**このIDはコミットすること**
（別の環境から同じプロジェクトへビルドを送るために要る）。

### 2. ビルド

```bash
npx eas-cli build --platform ios --profile production
```

初回は対話で次を訊かれる。

- **Apple アカウント** — Apple Developer Program のもの
- **証明書とプロビジョニングプロファイル** — 「EAS に任せる」を選ぶ。
  自動生成・管理され、Mac もキーチェーン操作も要らない
- **バンドルID** — `com.jenovos.kakeibo` が使われる（app.json から読む）

ビルドは10〜30分かかる。完了すると `.ipa` の URL が出る。

`eas.json` の `production` は `autoIncrement: true` なので、
ビルド番号は自動で上がる。`app.json` の `version`（1.0.0）は
ユーザーに見えるバージョンなので、上げるときは手で書き換える。

### 3. App Store Connect へ送る

```bash
npx eas-cli submit --platform ios --latest
```

送信後、App Store Connect の「ビルド」に出るまで
**10〜60分かかる**（Apple 側の処理待ち）。
処理中は選択できないので、時間を置いてから
バージョンの画面で「ビルドを選択」する。

## つまずきやすい点

| 症状 | 原因と対処 |
|---|---|
| バンドルIDが一致しないと言われる | `app.json` の `ios.bundleIdentifier` と App Store Connect の登録を揃える。**登録後は変更できない** |
| ビルドが「処理中」のまま出てこない | Apple 側の処理待ち。最大1時間ほど。メールで結果が届く |
| 「輸出コンプライアンス」を毎回訊かれる | `ITSAppUsesNonExemptEncryption: false` を設定済みなので出ないはず。出たら app.json を確認 |
| 課金商品が「準備完了」にならない | 税務・銀行情報が未登録。これがないとアプリの審査ごと落ちる |
| ATT のダイアログが審査で問題になる | 起動処理の最後、画面が見えたあとに出している（→ [06-monetization.md](./06-monetization.md)） |

## 提出前の最終チェック

```bash
npm run lint        # 型チェック
npm test            # domain 層のテスト
npm run check:ads   # AdMob のID設定
npm run shots       # スクリーンショットの書き出し（寸法を検証する）
```

App Store Connect 側で埋めるものは
[07-store-listing.md](./07-store-listing.md) にまとめてある。

## Android について

Play Console 用のビルドは同じ手順で `--platform android`。
ただし **AdMob の Android アプリを登録して ID を差し替えるまでは公開しないこと**。
現在は Google のテスト用IDが入っており、`npm run check:ads` が警告し続ける。
