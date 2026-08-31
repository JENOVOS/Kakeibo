# App Review への回答（Guideline 2.1 Information Needed）

初回提出でもっとも多い差し戻し。**アプリの不具合ではなく、
App Store Connect の「App Review に関する情報 → メモ」が空だったことが理由。**

対応は2つ。

1. 下の英文を「メモ」欄に貼る（次回以降の提出でも残る）
2. 実機で撮った操作動画をリプライに添える

審査担当は日本語話者とは限らないため、メモは**英語**で書く。

**メモ欄は 4000 字まで。** 下の文面は 3697 字に収めてある。
書き換えるときは字数を確認すること。

---

## そのまま貼る回答（英語）

```
Thank you for the review. Requested information follows.

1. SCREEN RECORDING
Attached to this reply. Captured on a physical iPhone running the
latest iOS, from launch through the core flows, the in-app purchase,
and the App Tracking Transparency prompt.

2. DEVICES AND OS TESTED
- iPhone 15 Pro / iOS 18.6
- iPhone 12 / iOS 18.5

3. FUNCTION AND TARGET AUDIENCE
A personal household budget (kakeibo) app for the Japanese market.

Problem: people who track daily spending usually give up because entry
is slow, and because they cannot tell they are overspending until the
month has ended.

Features:
- Record expenses, income and savings contributions as separate types
- Monthly and yearly budgets, overall and per category, with the
  option to override a single month
- Recurring costs (rent, utilities, subscriptions) posted
  automatically when due, or after user confirmation
- Savings goals with target amount and date, showing the monthly pace
  needed to reach them
- Category breakdown and yearly charts
- Export and restore all data as a JSON or CSV file

Audience: general consumers in Japan keeping a personal budget. Not
aimed at children. No social or user-generated content features.

All data is stored only in the local database on the device. There is
no user account, no server and no synchronisation.

4. SETUP AND ACCESS
No registration or login. No demo credentials are needed. Every
feature is reachable immediately after launch; default categories are
created on first launch, so no sample data is required.

- Record: round "+" button at the centre of the tab bar. Choose
  expense / income / savings, enter an amount, pick a category, save.
- Budget: "Budget" tab. Tap a category row to set an amount.
- Recurring costs: "Settings" tab, second row.
- Savings goals: "Settings" tab, third row (part of the paid unlock).
- Reports: "Settings" tab.
- Backup and restore, and delete-all-data: "Settings" tab.

IN-APP PURCHASE
One non-consumable product.
  Product ID: kakeibo_pro_unlock
  Price: JPY 500, one time. Not a subscription.
  Unlocks the savings goal feature and removes banner ads.
Reach it from the "Settings" tab (top row), or by tapping the locked
savings option on the record screen. A "Restore Purchases" button is
provided on the same screen.

PERMISSION PROMPTS
- App Tracking Transparency: shown shortly after first launch, only
  for personalised ads. All features remain available if declined.
- Notifications: requested only when the user taps the notification
  row in Settings. Used for local reminders before a recurring cost
  is due. No push server is involved.

5. EXTERNAL SERVICES
- Google AdMob: banner ads for users who have not purchased the
  unlock. Ads are removed after purchase.
- Apple In-App Purchase / StoreKit: purchase and restore. Validation
  happens on device through StoreKit; we operate no server.
No backend, no authentication service, no analytics SDK, no AI
service and no data provider. Apart from the two SDKs above the app
makes no network requests of its own.

6. REGIONAL DIFFERENCES
None. The app behaves identically in all regions. The interface is
Japanese only and amounts are shown in Japanese yen, as the app is
intended for the Japanese market.

7. REGULATED INDUSTRY / THIRD-PARTY MATERIAL
Not a regulated industry. The app is a personal note-taking tool for
household spending. It does not connect to banks, does not access
financial accounts, processes no payments other than Apple's in-app
purchase, and gives no financial, investment or tax advice.

No protected third-party material. All icons and artwork were created
for this app. No authorisation documents are required.

CONTACT
(your email address)
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
