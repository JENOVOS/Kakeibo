# 技術スタック

## 全体像

```
┌─────────────────────────────────────────────┐
│  画面 (app/)          expo-router + Paper   │
├─────────────────────────────────────────────┤
│  部品 (src/components/)                     │
├─────────────────────────────────────────────┤
│  読み書き (src/repositories/)               │  ← 画面はここだけを呼ぶ
├─────────────────────────────────────────────┤
│  純粋なロジック (src/domain/)               │  ← DB に依存しない。テスト対象
├─────────────────────────────────────────────┤
│  DB (src/db/)         Drizzle + expo-sqlite │
└─────────────────────────────────────────────┘
                    端末内 SQLite
```

外部通信は一切ない。`src/domain/` は DB にも React にも依存しない純関数だけで構成し、
Node の test runner でそのまま検証できるようにしてある（`npm test`）。

## 採用したもの

| レイヤ | 採用 | バージョン | 選定理由 |
|---|---|---|---|
| フレームワーク | **Expo (React Native)** | SDK 54 | 後述 |
| 言語 | **TypeScript** | 5.9 | 金額・日付の取り違えを型で防ぐ。`strict: true` |
| ルーティング | **expo-router** | 6.0 | ファイルベース。タブ + モーダルの構成が宣言的に書ける |
| DB | **expo-sqlite** | 16.0 | Expo Go でも動く公式 SQLite |
| ORM | **Drizzle ORM** | 0.45 | 型付きクエリ + マイグレーション生成。実行時オーバーヘッドが薄い |
| UI | **react-native-paper** | 5.15 | Material 3。ダークモード込みで整合が取れる。配色は独自テーマで上書き |
| アイコン | **@expo/vector-icons** | — | Paper の icon 名（MaterialCommunityIcons）がそのまま使える |
| 図形描画 | **react-native-svg** | 15 | 円グラフのみに使用 |
| 状態管理 | **zustand** | 5 | 共有状態は「表示中の年月」だけ。それ以外は SQLite が真実 |
| 検証 | **zod** | 4 | バックアップ JSON の取り込み時のみ |
| 日付 | **date-fns** | 4 | 月末・うるう年の計算。tree-shaking が効く |
| 通知 | **expo-notifications** | 0.32 | ローカル通知のみ（プッシュサーバーなし） |
| 入出力 | **expo-file-system / -sharing / -document-picker** | 19 / 14 / 14 | バックアップの読み書きと共有シート |
| 日付選択 | **自作**（`DatePickerDialog`） | — | 後述 |
| ビルド | **EAS Build / Submit** | — | 後述 |
| テスト | **node:test + tsx** | — | `src/domain/` の純粋ロジックを対象 |

## なぜ Expo か（Flutter ではなく）

### 決定的な理由: Windows から iOS アプリを出せる

開発環境が Windows 11。iOS アプリのビルドには通常 macOS が必要だが、
**EAS Build はクラウド上の Mac でビルドし、EAS Submit が App Store Connect への提出まで行う**。
Mac を用意せずに iOS 版をリリースできる。

Flutter でも Codemagic 等で同じことは可能だが、Expo は公式パスとして整備されており
詰まりどころが少ない。

### 副次的な理由

- 家計簿の画面は **フォーム・リスト・グラフ** が主体で、Flutter が優位に立つ
  「凝ったアニメーション」「両 OS で完全に同一の見た目」の要求が薄い
- TypeScript の既存知識をそのまま使える
- OTA アップデート（EAS Update）で、ストア審査を通さず軽微な修正を配れる

## 採用しなかったもの

| 候補 | 却下した理由 |
|---|---|
| Flutter | 上記のとおり。優位性が本件の要件に噛み合わない |
| React Native CLI（素の RN） | iOS ビルドに Mac が要る。ネイティブ設定を自前で管理する負担が増える |
| WatermelonDB / Realm | 同期を前提にした設計。サーバーを持たない本件では機能過剰 |
| AsyncStorage / MMKV | 集計クエリ（カテゴリ別合計、期間フィルタ）が SQL なしでは苦しい |
| Redux / Jotai | 共有状態が年月ひとつしかない。zustand で足りる |
| TanStack Query | サーバーがないのでキャッシュ層が不要。SQLite の変更通知を直接購読するほうが状態がズレない |
| react-native-gifted-charts | `react-native-linear-gradient`（Expo 非対応）に依存する |
| Victory Native XL | Skia + Reanimated + Gesture Handler が必要。円グラフ1枚のために重い |
| react-hook-form | フォームが小さく、`useState` + 独自パーサで足りる。依存を1つ減らした |
| rrule | 固定費に必要な繰り返しは3種類だけ。設定 UI が複雑になる割に使われない |
| @react-native-community/datetimepicker | OS 標準ピッカーは年の移動が月送りでしか行えず操作が重い。後述の理由で自作に置き換えた |

グラフについては **react-native-svg で円グラフを自作し、棒グラフは `View` の高さで描いている**。
必要なのは「円弧」と「矩形」だけで、チャートライブラリを入れると
Expo SDK の更新のたびにバージョン追従の負担が増える。

日付選択も同様に自作した（`src/components/DatePickerDialog.tsx`）。
OS 標準ピッカーは年を変えるのに月を何度も送る必要があり、
「去年の記録を入れる」「年払いの固定費を設定する」たびに操作が重かった。
年と月に独立した送りボタンを置くことで1タップで移動できる。
副次的に iOS / Android で見た目が揃い、ネイティブ依存も1つ減った。

## デザイン

**出典は Claude Design のモック**（`docs/家計簿アプリのUIモック-handoff/ui/project/Kakeibo App.dc.html`）。
色・書体・角丸・余白の実測値を `src/theme/index.ts` のトークンに落としてある。
同梱の `ios-frame.jsx`（端末フレーム）と `support.js`（プロトタイプのランタイム）は
足場なのでアプリには持ち込んでいない。

### 実装で採ったもの・採らなかったもの

モックはこのアプリと画面構成が一部違う（カレンダータブ・貯金目標・支払い方法・
テンキー・検索）。依頼は「既存機能を崩さずスタイリングする」ことなので、
**視覚言語だけを採り、情報設計は既存のまま**にしている。

| モックの要素 | 対応 |
|---|---|
| 配色・書体・角丸・影・余白 | そのまま採用 |
| グラデーションのホームヘッダー（今月の支出＋予算バー） | 採用（`HomeHeader`） |
| 中央に記録ボタンを持つタブバー | 採用（`TabBar`、タブ構成は既存の4つのまま） |
| 角丸正方形のカテゴリタイル | 採用（`CategoryTile`。従来は円） |
| 日付ごとのカードで区切る履歴 | 採用 |
| カレンダータブ / 貯金目標 / 支払い方法 / テンキー / 検索 | **見送り**（新機能にあたるため） |
| 予算タブ / 設定タブ / 固定費 / バックアップ | **維持**（モックには無いが既存機能） |

### 配色の原則

1. **彩度の高い色はアクセントに限定する。** ヘッダー・記録ボタン・選択状態だけに使い、
   面の大部分はニュートラルな青灰（`#F2F6FA` の下地に白いカード）で構成する
2. **収支の色（赤 = 支出 / 緑 = 収入）はテーマの外で固定する。**
   意味が固定されている色なので、テーマカラーを変えても入れ替わってはいけない
   （`semantic` として分離）

モックは金額を黒、収入だけを緑にしているが、このアプリは収支を並置する画面が多いため
支出にも識別色（`#D9603F`）を割り当てている。ここだけモックから意図的に外している。

### 書体

数値は **Manrope**（等幅数字）、日本語は端末の既定フォント。
モックは日本語に Noto Sans JP を指定しているが数MB あり、
iOS / Android の既定和文フォント（ヒラギノ / Noto Sans JP）と実機での差がほぼ無いため入れていない。
Manrope は欧文のみで軽く、金額表示の印象を決める部分なので採用した。
金額は必ず `src/components/Amount.tsx` を通す（書体と等幅指定をここに集約している）。

### トークンと共有部品

余白・角丸は `spacing` / `radius` から取り、画面ごとに数値を直書きしない。
カード状の要素はすべて `src/components/AppCard.tsx` を経由させ、
角丸・影・余白が画面ごとにばらつかないようにしている。

面の区切りはモック準拠でごく薄い影（`cardShadow`）。
iOS は shadow*、Android は elevation で、`Platform.select` を通して同じトークンから出す。

### 分類の出し方は classify に寄せる

一覧に出す「分類名・アイコン・色」は `src/domain/classification.ts` の
`classify()` を通す。種別が貯金ならカテゴリではなく積立先の目標を見る、
という判断がここに閉じている。

カテゴリだけを見て組むと、貯金の行が「未分類」と表示される。
新しく取引や固定費を並べる画面を足すときは、必ずこれを使うこと。

### テーマは既定でライト

モックはライト専用で、配色もライト前提で組まれている。
端末のダーク設定に追従させると、その配色が意図どおりに出ないため
**既定をライトに固定**し、ダークは設定から明示的に選ぶ形にした
（`useThemeStore`。`light` / `dark` / `system` の3択で、選択は `settings` テーブルに保存）。

ダークのパレットは維持してあるので、選べば従来どおり動く。

### タブバーを自前で描いている理由

中央の記録ボタンを持つ形にするため、`Tabs` の `tabBar` に自前の
`src/components/TabBar.tsx` を渡している。ルーティングには手を入れず、
navigation の state をそのまま使う。

自前にしたぶん、ナビゲータが内容へ自動で下余白を入れてくれるとは限らないので、
タブ画面のスクロールには `useTabBarPadding()` で下端の余白を足すこと。
忘れると最後の項目がバーに隠れる。

### テーマは2系統あるので必ず両方に流す

Paper と React Navigation は**別々のテーマ**を持っている。
`PaperProvider` だけを設定して `@react-navigation/native` の `ThemeProvider` を省くと、
画面の下地だけが常にライト（白）のまま描かれ、
ダークモードで「白背景に明るい文字」となって内容が読めなくなる。

`app/_layout.tsx` で Paper のテーマから Navigation 用テーマを組み立てて両方に渡している。
配色を変えるときは `src/theme/index.ts` だけを直せば両方に反映される。

### 文字入力中に他の項目を押したらキーボードを閉じる

フォームの `ScrollView` は `keyboardShouldPersistTaps="handled"` にしてある。
これは「1タップで目的の操作が起きる」ために必要な設定だが、
**キーボードは自動では閉じない**。

そのため、日付・カテゴリ・収支トグルなど文字入力以外のコントロールは、
`onPress` の先頭で `Keyboard.dismiss()` を呼ぶ。
呼び忘れると、キーボードが出たまま日付ピッカーが開き、
カレンダーと決定ボタンがキーボードに隠れて操作できなくなる。

呼び出しは共有部品（`DateField` / `CategoryPicker` / `TypeToggle`）の側に入れてあるので、
新しい画面でそれらを使うぶんには意識しなくてよい。
画面に固有のコントロールを足すときだけ、同じ扱いにすること。

### アイコン名は glyphmap で実在を確認する

`ICON_GROUPS`（`src/theme/index.ts`）に載せるアイコン名は、
MaterialCommunityIcons に実在するものだけにする。
存在しない名前を書いても型でもビルドでも落ちず、実行時に代替文字が出るだけで気づけない。

```bash
node -e "const g=require('./node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'); console.log(Object.keys(g).length)"
```

現在 150 種を12グループに分けて登録してある（全件を上記 glyphmap で照合済み）。

### 日本語を入力する欄に value を渡さない

日本語を打つ入力欄（カテゴリ名・固定費名・メモなど）は
`src/components/TextField.tsx` を使う。Paper の `TextInput` を直接使ってよいのは
金額のような **IME を通らない数値入力だけ**。

理由。`TextInput` に `value` を渡して制御コンポーネントにすると、
onChangeText → setState → 再描画で値を書き戻す流れになり、
これが日本語の「未確定文字（marked text）」を壊す。

とくにトグル入力（「か」を連打して か→き→く と送る打ち方）では、
送っている最中の文字はまだ未確定の状態にある。そこへ JS から値を書き戻すと
OS が未確定文字をいったん確定させてしまうため、連打が送りではなく
新しい文字の追加になり「かかか」のように増えていく。

`TextField` は `value` の代わりに `defaultValue` を渡し、入力中の文字列を OS 側に任せる。
Paper の `TextInput` は `value` が undefined なら内部状態で動く実装になっており、
ラベルの浮き上がりもそのまま機能する。
外から中身を入れ直したいとき（ダイアログを開いた／DB から読み込んだ）は
`resetKey` を変えて作り直す。

`maxLength` も同じ理由で付けない。iOS の `maxLength` は入力途中の文字列を切り詰め、
やはり未確定文字を壊すため。長さの制限は repositories 側の保存時に行う
（`NAME_MAX` / `MEMO_MAX`）。

### モーダル画面のダイアログには Portal.Host を置く

`presentation: 'modal'` の画面（記録・固定費・カテゴリ編集）で開くダイアログは、
その画面のなかに `Portal.Host` を置いた上で描く必要がある。

Paper の `Portal` は既定でアプリ最上位（`PaperProvider` が持つ Host）に描画されるが、
モーダル画面はネイティブ側で別レイヤーとして手前に出るため、
最上位に描かれたダイアログは**モーダルの背面に隠れて見えなくなる**
（ボタンを押しても何も起きないように見える）。
`Portal` は `PortalContext` でいちばん近い Host を選ぶので、
画面内に Host を置けば手前に出る。

モーダル画面にダイアログを足すときは、この Host があることを必ず確認すること。

## データ再取得の仕組み

サーバーがないため、キャッシュ層を置かず **書き込みのたびに読み直す**。

```
画面 ──useDbQuery(() => 何かを読む)──▶ repositories ──▶ SQLite
  ▲                                                       │
  └────── addDatabaseChangeListener（変更通知） ───────────┘
```

`expo-sqlite` を `enableChangeListener: true` で開いているので、
どこかで `INSERT` / `UPDATE` / `DELETE` が起きると全画面のクエリが再実行される。
画面側に「保存したら再読込する」を書く必要がない。
連続した書き込みは 60ms でデバウンスして1回にまとめている
（→ [`src/hooks/useDbQuery.ts`](../src/hooks/useDbQuery.ts)）。

## ディレクトリ構成

```
app/                       画面（expo-router のファイルベースルーティング）
  _layout.tsx              起動処理（マイグレーション → seed → 固定費計上 → 通知）
  (tabs)/                  ホーム / 履歴 / 予算 / 設定
  entry.tsx                取引の入力（新規・編集の兼用、モーダル）
  categories/              カテゴリ管理
  recurring/               固定費管理
  report.tsx               年間レポート
src/
  db/
    schema.ts              Drizzle スキーマ（テーブル定義の唯一の場所）
    client.ts              DB 接続と PRAGMA 設定
    seed.ts                初期カテゴリ
  domain/                  純粋なロジック（DB・React に非依存）
    money.ts               金額の整数変換・書式化
    period.ts              年月・日付範囲
    recurring.ts           繰り返し規則の日付計算
  repositories/            SQL を書く唯一の層
  hooks/useDbQuery.ts      DB 変更に追従する読み取りフック
  components/              再利用する UI 部品
  services/notifications.ts ローカル通知
  stores/                  zustand（表示中の年月のみ）
  theme/                   配色・カテゴリ用パレット
drizzle/                   drizzle-kit が生成するマイグレーション（手で編集しない）
tests/                     domain 層のテスト
docs/                      このフォルダ
```

### 層をまたぐルール

- **画面は SQL を書かない。** 必ず `repositories/` を通す
- **`domain/` は DB を import しない。** 型（`import type`）のみ許可
- **テーブル定義は `db/schema.ts` だけ。** 変更したら `npm run db:generate` を実行

## SDK バージョンの方針

**SDK 54 に固定している。** 最新は 57 だが、上げると Expo Go で動かなくなる。

App Store の Expo Go は **54.0.2**（2025-09-23 リリース）で止まっており、
対応 SDK は 54 まで。SDK 55 以降を使うと
`Project is incompatible with this version of Expo Go` になる。

SDK 55+ に上げるには次のいずれかが必要になる。

| 手段 | 必要なもの |
|---|---|
| Android で開発ビルド | 無料。`expo-dev-client` + EAS ビルド |
| iPhone 実機で開発ビルド | Apple Developer Program **$99/年** |
| iOS シミュレータ | Mac |

ストアへ公開する段階では結局ビルドを作るので SDK を上げても問題ないが、
Expo Go での手軽な確認を続けたい間は 54 のままにしておく。

## その他のバージョン方針

- Expo SDK のマイナー更新は `npx expo install --check` で追従する
- ネイティブモジュールの追加は必ず `npx expo install <pkg>`（`npm install` は使わない）
  — SDK に対応したバージョンが選ばれる
- peer dependency の解決は `.npmrc` の `legacy-peer-deps=true` で緩めてある
  （`expo-router` が web 用に引き込む `react-dom` と `react` の指定が食い違うため。
  ネイティブビルドには影響しない）
- `@expo/config-plugins` を devDependency に入れているのは、
  `@react-native-community/datetimepicker` の config plugin が
  プロジェクト直下からこれを解決しようとするため（SDK 54 では hoist されない）
