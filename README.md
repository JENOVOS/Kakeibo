# 家計簿アプリ

iOS / Android 向けの家計簿アプリ。データは端末内にのみ保存し、外部に送信しない。

- 支出と収入を分けて管理
- 毎月・毎年の予算設定（全体 / カテゴリ別、既定値と特定月の上書き）
- 固定費・定期収入の自動記録とリマインダー
- JSON / CSV でのバックアップと復元

## はじめかた

```bash
npm install
npx expo start
```

QR コードを Expo Go で読み込むと実機で動く。

> Expo Go で動かすため **Expo SDK 54** に固定している。
> App Store の Expo Go が 54 までしか対応していないため、SDK を上げると
> `Project is incompatible with this version of Expo Go` になる。
> 詳細は [技術スタック](./docs/02-tech-stack.md#sdk-バージョンの方針)。

```bash
npm test        # domain 層のテスト
npm run lint    # 型チェック
```

## ドキュメント

設計の理由と手順は [docs/](./docs/) にまとめてある。

- [要件定義](./docs/01-requirements.md)
- [技術スタック](./docs/02-tech-stack.md)
- [データモデル](./docs/03-data-model.md)
- [開発手順](./docs/04-development.md)
- [リリース手順](./docs/05-release.md)

## 構成

```
app/          画面（expo-router）
src/
  db/         スキーマと接続
  domain/     純粋なロジック（DB 非依存・テスト対象）
  repositories/  SQL を書く唯一の層
  components/ UI 部品
drizzle/      生成されたマイグレーション（手で編集しない）
tests/        domain 層のテスト
```

## リリース前に必ず変更するもの

`app.json` のバンドル ID が `com.example.kakeibo` のままになっている。
ストアに登録すると変更できないため、公開前に自分のものへ差し替えること。
詳細は [リリース手順](./docs/05-release.md#2-リリース前に必ず直すもの)。
