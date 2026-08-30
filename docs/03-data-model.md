# データモデル

定義の実体は [`src/db/schema.ts`](../src/db/schema.ts)。このドキュメントは
**なぜその形なのか** を記録する。スキーマを変更したらこちらも更新すること。

## 全体の関係

```
categories ────┬──< transactions >── recurrings
               │        (固定費から生成された取引は recurring_id を持つ)
               └──< budgets

savings_goals ─┬──< transactions   (type = 'savings' の積立)
               └──< recurrings     (毎月の自動積立)

settings （独立した Key-Value）
```

## 貫いている2つの規約

### 金額は INTEGER（円）

すべての金額カラムは `INTEGER`。小数を使わない。

浮動小数を入れると、カテゴリ別合計 → 全体合計 の突き合わせで必ず 1円のずれが出る。
家計簿でこれが起きると「アプリが間違っている」と受け取られ、信頼を失う。

将来の外貨対応も、最小通貨単位の整数 + 通貨コードで表現できるため、この規約は妨げにならない。

### 日付は 'YYYY-MM-DD' の TEXT

SQLite に日付型はない。`TEXT` で `'2026-08-30'` 形式に統一している。

この形式なら **辞書順 = 時系列順** になるため、

```sql
WHERE occurred_on BETWEEN '2026-08-01' AND '2026-08-31'
```

がそのまま月次集計になり、`ORDER BY occurred_on` がそのまま日付順になる。
UNIX 時刻（INTEGER）にすると、DB を直接覗いたときに読めず、
タイムゾーンの解釈が入り込む余地も生まれる。

`created_at` / `updated_at` だけは監査用途なので `current_timestamp` の TEXT を使う。

---

## categories

支出カテゴリと収入カテゴリ。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER PK | |
| `type` | TEXT | `'expense'` / `'income'` |
| `name` | TEXT | |
| `icon` | TEXT | MaterialCommunityIcons の名前 |
| `color` | TEXT | `#RRGGBB` |
| `sort_order` | INTEGER | 表示順。10 刻みで採番し、間に挿入できるようにしてある |
| `is_archived` | INTEGER (bool) | true = 新規入力の候補から外す |
| `created_at` | TEXT | |

**索引**
- `idx_categories_type (type, is_archived, sort_order)` — 入力画面のカテゴリ一覧
- `uq_categories_type_name (type, name)` UNIQUE — 同じ種別に同名を作らせない

### 設計判断

**支出用と収入用でテーブルを分けない。**
`type` カラム1本で分離する。カテゴリの操作（追加・改名・並べ替え・アーカイブ）は
種別に関係なく同一なので、分けるとコードが丸ごと二重になる。

**削除ではなくアーカイブを基本にする。**
`is_archived` を持つのは、使用中のカテゴリを消させないため。
消すと過去の取引が「未分類」に化け、履歴の意味が変わってしまう。
取引が 0 件のときだけ物理削除を許可している。

---

## transactions

1件の支出または収入。このアプリの中心テーブル。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER PK | |
| `type` | TEXT | `'expense'` / `'income'` |
| `amount` | INTEGER | **常に正**。符号ではなく `type` で収支を判別する |
| `occurred_on` | TEXT | `'YYYY-MM-DD'` |
| `category_id` | INTEGER FK → categories | NULL 可（未分類）。カテゴリ削除時は `SET NULL` |
| `memo` | TEXT | NULL 可 |
| `recurring_id` | INTEGER FK → recurrings | 固定費から生成された場合のみ。`SET NULL` |
| `created_at` / `updated_at` | TEXT | |

**索引**
- `idx_transactions_date (occurred_on)` — 月次一覧
- `idx_transactions_type_date (type, occurred_on)` — 収支別集計
- `idx_transactions_category (category_id, occurred_on)` — カテゴリ別集計
- `uq_transactions_recurring_date (recurring_id, occurred_on) WHERE recurring_id IS NOT NULL` UNIQUE

### 設計判断

**`amount` を常に正にする。**
支出を負数で持つ設計もあり得るが、そうすると「合計」の意味が文脈依存になり
（`SUM` が収支なのか支出額なのか読めなくなる）、UI 側で毎回 `Math.abs` が要る。
種別で分けるほうが集計クエリが素直に書ける。

**部分ユニーク索引で二重計上を防ぐ。**
`uq_transactions_recurring_date` は、同じ固定費が同じ日に2回計上されるのを DB レベルで防ぐ。
これがあるおかげで、起動時の計上処理（`postDue`）を何度呼んでも安全になり、
アプリ側で「もう計上したか」を記録・判定する必要がなくなる。
`WHERE recurring_id IS NOT NULL` の条件を付けているのは、
SQLite の UNIQUE が NULL 同士を別物として扱うため、手動入力の取引（`recurring_id` が NULL）を
制約の対象外にする意図を明示するもの。

---

## budgets

月次・年次の予算。要件 FR-2 の中心。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER PK | |
| `period` | TEXT | `'monthly'` / `'yearly'` |
| `year` | INTEGER | **0 = 既定**（期間を限定しない）。2026 なら その年 |
| `month` | INTEGER | monthly のみ 1-12。yearly と既定は 0 |
| `category_id` | INTEGER FK → categories | **NULL = 全体予算**。`CASCADE` |
| `amount` | INTEGER | |
| `created_at` | TEXT | |

**索引**
- `uq_budgets_overall (period, year, month) WHERE category_id IS NULL` UNIQUE
- `uq_budgets_category (period, year, month, category_id) WHERE category_id IS NOT NULL` UNIQUE

### 設計判断

**既定と上書きを、別テーブルではなく `year = 0` のセンチネルで表す。**

解決順は次のとおり:

```
(year=2026, month=12) の行がある  → それを使う   （上書き）
なければ (year=0, month=0) の行   → それを使う   （既定）
どちらも無い                      → 予算未設定
```

これにより「毎月の食費は3万、ただし12月だけ5万」が **行の追加だけ** で表現できる。
`budgets` と `budget_overrides` の2テーブルに分ける案もあったが、
解決ロジックが2箇所に散り、UNION が必要になるだけで得るものがない。

全体予算とカテゴリ別予算も、`category_id` が NULL かどうかで同じテーブルに同居させている。
両者は「ある範囲の支出合計に上限を設ける」という同一の概念で、
消化率の計算式も共通だから。

**ユニーク索引が2本に分かれている理由。**
SQLite（および標準 SQL）の UNIQUE 制約は NULL 同士を「異なる値」として扱うため、
`UNIQUE(period, year, month, category_id)` 1本では
`category_id IS NULL` の行（＝全体予算）が何行でも作れてしまう。
そのため NULL の場合と非 NULL の場合で部分索引を分けている。

これに伴い、更新は `ON CONFLICT` ではなく明示的な「検索 → INSERT / UPDATE」で行っている
（→ [`src/repositories/budgets.ts`](../src/repositories/budgets.ts) の `setAmount`）。

---

## recurrings

固定費・定期収入の「テンプレート」。これ自体は取引ではなく、ここから `transactions` を生成する。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER PK | |
| `name` | TEXT | 「家賃」「電気代」など |
| `type` | TEXT | `'expense'` / `'income'` |
| `amount` | INTEGER | |
| `category_id` | INTEGER FK → categories | NULL 可。`SET NULL` |
| `memo` | TEXT | |
| `kind` | TEXT | `'monthly'` / `'yearly'` / `'weekly'` |
| `day` | INTEGER | monthly: 1-31 / weekly: 0(日)-6(土) / yearly: 日 |
| `month` | INTEGER | yearly のときの月 (1-12)。それ以外は NULL |
| `starts_on` | TEXT | この日より前には発生しない |
| `ends_on` | TEXT | NULL = 無期限 |
| `next_due_on` | TEXT | **次に計上すべき日**。計上のたびに前進する |
| `auto_post` | INTEGER (bool) | true = 自動計上 / false = 手動確定 |
| `notify_days_before` | INTEGER | 何日前に通知するか。NULL = 通知しない |
| `is_active` | INTEGER (bool) | false = 一時停止 |
| `created_at` | TEXT | |

**索引**
- `idx_recurrings_due (is_active, next_due_on)` — 起動時の期日判定

### 設計判断

**予定を先に生成して確定させる。**
「固定費は集計時に動的に足す」方式にすると、予算の残額が月の途中で
実績だけを反映して甘く見え、月末に急に足りなくなる。
先に取引として計上しておけば、月初から正しい残額が見える。

**`next_due_on` をカラムとして持つ。**
毎回 `starts_on` から規則を展開して「どこまで計上済みか」を判定することもできるが、
起動のたびに全件を展開するのは無駄で、判定ロジックのバグが計上漏れに直結する。
カーソルを1本持ち、計上のたびに前に進めるほうが単純で速い。

**「まとめて追加」では recurrings の行を作らない。**
期間を指定した一括登録は `transactions` を直接作るだけで、規則は残さない。
「もう決まっている出費を一度で入れる」用途であり、継続的な自動記録とは目的が違うため。
そのぶん `recurring_id` が NULL になり、二重生成をユニーク索引で防げない
（UI 側で件数を示す確認ダイアログを必ず挟む）。

**繰り返しは3種類に絞る。**
`rrule` のような汎用規則は表現力が高いが、設定 UI が一気に難しくなる。
家計簿の固定費で「第2火曜日」「2ヶ月ごと」が必要になることはまずない。
毎月31日は「月末」として扱い、2月なら28日（うるう年は29日）に丸める。

**長期間アプリを開かなかった場合。**
`postDue` は `next_due_on` が今日以前である限りループして計上する。
暴走を防ぐため 1規則あたり 400 回で打ち切る（毎週でも約7年半ぶん）。

---

## savings_goals

貯金の目標。「何のために・いくら・いつまでに」を持つ。

| カラム | 型 | 説明 |
|---|---|---|
| `id` | INTEGER PK | |
| `name` | TEXT | 目的（「沖縄旅行」など） |
| `target_amount` | INTEGER | 目標金額（円） |
| `target_date` | TEXT | 目標日 `'YYYY-MM-DD'`。NULL = 期限なし |
| `memo` | TEXT | |
| `icon` / `color` | TEXT | 表示用 |
| `sort_order` | INTEGER | |
| `is_archived` | INTEGER (bool) | true = 積立先の候補から外す |
| `created_at` | TEXT | |

**索引**
- `idx_savings_goals_active (is_archived, sort_order)`

### 設計判断

**残高カラムを持たない。**
貯まった額は `transactions`（`type = 'savings'` かつ `savings_goal_id` 一致）の合計で毎回求める。
残高を別に持つと、取引の追加・修正・削除のたびに更新が要り、
どこかで漏れた瞬間に「取引の合計と残高が合わない」状態になる。
家計簿でこれが起きると原因が追えない。

**取引の種別を3つにした。**
`transactions.type` に `'savings'` を追加している。
支出のレコードとして持たせなかったのは、カテゴリ別の集計に混ざってしまうため
（貯金にカテゴリは無い）。種別を分けておけば、
「カテゴリ別は支出だけ」「全体の合計には貯金も足す」を別々に扱える。

集計での扱いは [要件 FR-7](./01-requirements.md#fr-7-貯金) のとおりで、
**全体の支出・収支・全体予算の消化には貯金を含める**。
足し引きの意味は `src/domain/summary.ts` に純関数として切り出し、テストで固定してある。

**カテゴリと目標は別物。**
`categories.type` は `'expense' | 'income'` のまま（`CategoryType`）で、
貯金にカテゴリは付かない。貯金では「目標」が分類の役割を持つため、
`transactions.savings_goal_id` がカテゴリの代わりになる。

**目標を消しても取引は残す。**
`savings_goal_id` の外部キーは `ON DELETE SET NULL`。
ただし積立の記録が1件でもある目標は UI 側で削除させず、アーカイブを促す
（消すと過去の積立が行き先不明になるため）。

---

## settings

アプリ設定の Key-Value。

| カラム | 型 |
|---|---|
| `key` | TEXT PK |
| `value` | TEXT |

現在のキー:

| キー | 用途 |
|---|---|
| `seeded_at` | 初期カテゴリ投入済みフラグ |
| `notify_at` | 通知する時刻 `'HH:mm'` |
| `last_backup_at` | 最後にバックアップした日時 |
| `month_start_day` | 締め日（下地のみ。UI 未実装） |
| `last_post_run_on` | 固定費計上の最終実行日（予約） |
| `theme_mode` | 表示テーマ `'light'` / `'dark'` / `'system'`。未設定はライト |

### 設計判断

AsyncStorage や MMKV を足さず SQLite に置いている。
バックアップ・復元・全消去の対象が **DB ファイルひとつ** で済み、
「設定だけ復元されなかった」という事故が起きない。

---

## マイグレーション

```bash
# schema.ts を編集したあとに実行
npm run db:generate
```

`drizzle/` 配下に SQL とジャーナルが生成される。**手で編集しない。**
アプリ起動時に `useMigrations` が未適用ぶんを流す（→ [`app/_layout.tsx`](../app/_layout.tsx)）。

`.sql` ファイルを JS から import するために `babel-plugin-inline-import` と
`metro.config.js` の `sourceExts` への `'sql'` 追加が必要。両方とも設定済み。

### 注意

すでに配布したバージョンのマイグレーションは書き換えない。
ユーザーの端末には適用済みのものが残っているため、
変更したい場合は必ず新しいマイグレーションを追加する。
