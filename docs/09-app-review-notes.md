# App Review への回答（Guideline 2.1 Information Needed）

初回提出でもっとも多い差し戻し。**アプリの不具合ではなく、
App Store Connect の「App Review に関する情報 → メモ」が空だったことが理由。**

対応は2つ。

1. 下の英文を「メモ」欄に貼る（次回以降の提出でも残る）
2. 実機で撮った操作動画をリプライに添える

審査担当は日本語話者とは限らないため、メモは**英語**で書く。

---

## そのまま貼る回答（英語）

```
Thank you for the review. Please find the requested information below.

--------------------------------------------------
1. SCREEN RECORDING
--------------------------------------------------
A screen recording is attached to this reply. It was captured on a
physical iPhone running the latest iOS, starting from app launch and
covering the core flows, the in-app purchase, and the App Tracking
Transparency prompt.

--------------------------------------------------
2. DEVICES AND OS VERSIONS TESTED
--------------------------------------------------
- (例) iPhone 15 Pro - iOS 18.6
- (例) iPhone 12 - iOS 18.5
  ※ 実際にテストした端末とOSに置き換えてください

--------------------------------------------------
3. APP FUNCTION AND TARGET AUDIENCE
--------------------------------------------------
This is a personal household budget (kakeibo) app for the Japanese
market.

Problem it solves:
People who want to track daily spending usually give up because entry
is slow and because they cannot tell whether they are overspending
until the end of the month.

What the app provides:
- Record expenses, income, and savings contributions as separate types
- Set monthly and yearly budgets, both overall and per category,
  with the ability to override a single month
- Register recurring costs (rent, utilities, subscriptions) that are
  posted automatically when they come due
- Set savings goals with a target amount and target date, and see the
  required monthly pace
- Review spending with category breakdown and yearly charts
- Export and restore data as a JSON or CSV file

Target audience:
General consumers in Japan who keep a personal household budget.
The app is not aimed at children and has no social or user-generated
content features.

All budget data is stored only in the local database on the device.
There is no user account, no server, and no synchronization.

--------------------------------------------------
4. HOW TO SET UP AND ACCESS THE MAIN FEATURES
--------------------------------------------------
No account registration or login is required, and no demo credentials
are needed. All features are reachable immediately after launch.
Default categories are created on first launch, so no sample data or
setup file is necessary.

- Record: tap the round "+" button at the center of the tab bar.
  Choose 支出 (expense), 収入 (income), or 貯金 (savings), enter an
  amount, pick a category, then tap 保存 (Save).
- Budget: "予算" tab. Tap a category row to set a monthly or yearly
  budget amount.
- Recurring costs: "設定" tab -> 固定費・定期収入.
- Savings goals: "設定" tab -> 貯金の目標. This feature is part of the
  paid unlock (see below).
- Reports: "設定" tab -> 年間レポート.
- Backup: "設定" tab -> バックアップを書き出す / 復元する.
- Delete all data: "設定" tab -> すべてのデータを削除.

IN-APP PURCHASE (how to reach it):
The app offers one non-consumable in-app purchase.
  Product ID: kakeibo_pro_unlock
  Price: JPY 500 (one-time, not a subscription)
  Unlocks: the savings goal feature, and removes banner ads

To reach the purchase screen, either:
  (a) "設定" tab -> "すべての機能を解放", or
  (b) tap the locked 貯金 (savings) option on the record screen.

A "購入を復元" (Restore Purchases) button is provided on the same
screen, as required for non-consumable purchases.

PERMISSION PROMPTS:
- App Tracking Transparency: shown shortly after first launch, only to
  serve personalized ads. All features remain fully available if the
  request is declined.
- Notifications: requested only when the user taps "通知を許可する" in
  the 設定 tab. Used for local reminders before a recurring cost is
  due. No push server is involved.

--------------------------------------------------
5. EXTERNAL SERVICES AND TOOLS
--------------------------------------------------
- Google AdMob (react-native-google-mobile-ads): banner ads for users
  who have not purchased the unlock. Ads are removed after purchase.
- Apple In-App Purchase / StoreKit (via expo-iap): purchase and
  restore. Purchase validation is performed on device through
  StoreKit; there is no server of our own.

The app has no backend, no authentication service, no analytics SDK,
no AI service, and no data provider. Apart from the AdMob and StoreKit
SDKs above, the app makes no network requests of its own.

--------------------------------------------------
6. REGIONAL DIFFERENCES
--------------------------------------------------
There are no regional differences in features or content. The app
behaves identically in all regions. The user interface is provided in
Japanese only and amounts are shown in Japanese yen, as the app is
intended for the Japanese market.

--------------------------------------------------
7. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
--------------------------------------------------
The app does not operate in a regulated industry. It is a personal
note-taking tool for household spending. It does not connect to banks
or financial institutions, does not access financial accounts, does
not process payments other than Apple's own in-app purchase, and does
not provide financial, investment, or tax advice.

The app contains no protected third-party material. All icons and
artwork were created for this app. No license or authorization
documents are required.

--------------------------------------------------
CONTACT
--------------------------------------------------
(あなたのメールアドレス)
```

---

## 動画の撮り方

**実機**で、**最新の iOS**で撮る。シミュレータの録画は不可。
起動から始め、下の順に通す。ナレーションは不要。

1. **ホーム画面に戻ってからアプリを起動**（起動画面から映す）
2. **ATT のダイアログが出るところを必ず映す** — 指摘事項に明記されている。
   許可・拒否どちらでもよいが、ダイアログが出た事実を映す
3. 中央の「＋」→ 金額を入力 → カテゴリを選ぶ → 保存
4. ホームに戻り、記録が反映されたことを見せる
5. 「予算」タブ → カテゴリの予算を設定 → バーが動くのを見せる
6. 「設定」→ 固定費・定期収入 → 1件登録
7. **「設定」→「すべての機能を解放」→ 購入画面を開き、実際に購入する**
   （Sandbox アカウントなら課金されない）
8. **購入後に貯金機能が開き、広告が消えることを見せる**
9. 「購入を復元」を押すところも映す
10. 「設定」→ バックアップを書き出す
11. 「設定」→ すべてのデータを削除（データ削除の導線があることを示す）

**7〜9 は特に重要。** 指摘の1番に「課金機能へのアクセスと購入フロー」が
明記されており、ここが映っていないと同じ理由で再び差し戻される。

撮影は iPhone の画面収録（コントロールセンター）でよい。
長さは3〜5分程度。App Store Connect のリプライに動画を添付する。

---

## 併せて直したほうがよい点

### スクリーンショットを実機のものに差し替える

差し戻しの「よくある問題」欄に **Guideline 2.3.3** が挙がっている。

> Screenshots must show the actual app in use

現在ストアに出しているスクリーンショットは、実装の値から起こした**再現画像**で、
実機のキャプチャではない（→ [07-store-listing.md](./07-store-listing.md)）。
今回、動画を撮るために実機で動かすはずなので、
**その場で実画面のスクリーンショットも撮って差し替える**のが安全。

再現画像は実装に忠実に作ってあるが、「実際のアプリの使用中の画面」を
求める規定に照らすと、実機のキャプチャのほうが確実に安全。

### 課金商品の状態を確認する

審査担当が購入を試せないと、そこで再び止まる。
App Store Connect で `kakeibo_pro_unlock` が
**「提出準備完了」以上の状態**になっていること、
**税務・銀行情報の登録が完了している**ことを確認する
（未登録だと商品が有効にならない → [06-monetization.md](./06-monetization.md)）。
