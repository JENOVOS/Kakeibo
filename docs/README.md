# ドキュメント

| ファイル | 内容 |
|---|---|
| [01-requirements.md](./01-requirements.md) | 要件定義。機能要件、スコープ外の判断、用語 |
| [02-tech-stack.md](./02-tech-stack.md) | 技術スタックの選定理由、採用しなかった候補、構成 |
| [03-data-model.md](./03-data-model.md) | DB スキーマと、その形にした理由 |
| [04-development.md](./04-development.md) | 開発環境、コマンド、テスト、注意点 |
| [05-release.md](./05-release.md) | ストア公開の手順と必要なもの |
| [06-monetization.md](./06-monetization.md) | 買い切り課金と広告。ストア登録と審査対応 |

## 3行での要約

- **Expo (React Native) + TypeScript + 端末内 SQLite**。サーバーを持たない
- 支出/収入は `transactions.type` で分離、予算は「既定 + 期間上書き」、固定費は `next_due_on` カーソルで計上
- Windows から EAS Build で iOS / Android の両方を出せる

## 変更時に併せて更新するもの

UI モックの原本は `docs/家計簿アプリのUIモック-handoff/`（Claude Design からの handoff）。
デザインの解釈と、採用/見送りの判断は 02-tech-stack.md の「デザイン」節に記録してある。

| 変更したもの | 更新するドキュメント |
|---|---|
| `src/db/schema.ts` | 03-data-model.md（＋ `npm run db:generate`） |
| 依存パッケージ | 02-tech-stack.md |
| 機能の追加・削除 | 01-requirements.md |
| `app.json` のストア設定 | 05-release.md |
| 課金・広告 | 06-monetization.md |
| 配色・書体・余白（`src/theme`） | 02-tech-stack.md |
