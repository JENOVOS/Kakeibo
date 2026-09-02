# 2回目の差し戻し（Guideline 2.1(a) / 2.1(b)）への対応

Submission ID: 4e6d1e77-5fb0-40a5-a93c-1e26758f7f2e
Review date: 2026-09-02 / Review device: iPad Air 11-inch (M3), iPadOS 26.6
Version reviewed: 1.0 (2)

## 2つの指摘は同じ原因

**2.1(b)** 課金商品（`kakeibo_pro_unlock`）が審査に提出されていない。
**2.1(a)** 購入画面にエラーが表示された。

**2.1(a) は 2.1(b) の症状。** 商品を審査に出していないと、審査環境の
StoreKit は商品を返さない。すると `loadProduct()` が null を返し、
購入画面が「ストアに接続できません」というエラー表示になっていた。
審査担当はそれを不具合として報告している。

なお iPad で審査されているのは正常。`supportsTablet: false` でも
iPhone 用アプリは iPad にインストールでき、Apple は互換モードで審査する。
iPad 固有の不具合ではない。

## 対応1: 課金商品を審査に提出する（App Store Connect の作業）

**これが本体。** アプリを直すだけでは通らない。

1. App Store Connect →「App内課金」→ `kakeibo_pro_unlock`
2. **審査用スクリーンショット**を登録する（必須。無いと提出できない）
   - 購入画面を撮ったもの。iPhone のスクリーンショットでよい
   - `docs/store/screenshots/` の課金画面ではなく、
     **実機で購入画面を開いて撮ったもの**を使う
3. 審査メモに、購入画面への行き方を書く
4. **アプリのバージョンに課金商品を紐づけてから提出する**
   バージョンのページ →「App内課金」セクションで選択する。
   ここで紐づけないと、商品を作っただけでは審査に回らない
5. 税務・銀行情報が未登録だと商品が有効にならない。先に済ませる

## 対応2: 購入画面を行き止まりにしない（コード側）

商品が取れないのは審査前に限らない（圏外、StoreKit の一時障害）。
エラー文だけを出して操作できない画面は、実ユーザーにも不具合に見える。

`app/pro.tsx` を次のように変えた。

- 価格が取れないときは **「価格を読み込む」ボタン**を出し、何度でも再取得できる
  （以前は無効化されたボタンに「ストアに接続できません」と出るだけだった）
- 文面を「取得できませんでした。もう一度お試しください」に和らげた
- 購入済みの人向けに「購入を復元」への導線を明記した
- 再取得の処理を `load()` に切り出し、初回表示と再試行で共用する

バージョンを 1.0.1 に上げた。ビルド番号は EAS が自動で上げる。

## 提出の順番

1. 課金商品に審査用スクリーンショットを登録する
2. `npx eas-cli build --platform ios --profile production`
3. `npx eas-cli submit --platform ios --latest`
4. バージョンのページで **ビルドと課金商品の両方**を選ぶ
5. 提出

## Apple への返信文

```
Thank you for the follow-up.

Both issues had the same root cause: the in-app purchase product was
not submitted for review, so StoreKit returned no product in the
review environment, and the purchase screen showed an error message.

What we have done:

1. Guideline 2.1(b)
The in-app purchase "kakeibo_pro_unlock" has now been submitted for
review together with this build, with the required App Review
screenshot attached.

2. Guideline 2.1(a)
We also made the purchase screen resilient when product information
cannot be loaded, which can happen offline or during a temporary
StoreKit failure. Instead of showing an error on a screen with no
available action, it now shows a "Load price" button that retries the
request, and it points users to "Restore Purchases" if they have
already bought the unlock. This is included in the new build.

The app is iPhone-only (supportsTablet is false) and runs on iPad in
iPhone compatibility mode. We confirmed the purchase screen behaves
correctly there as well.

Product details for your reference:
  Product ID: kakeibo_pro_unlock
  Type: non-consumable, JPY 500, one time (not a subscription)
  Unlocks: the savings goal feature, and removes banner ads
  Path: "Settings" tab, top row. A "Restore Purchases" button is on
  the same screen.

Thank you for your time.
```
