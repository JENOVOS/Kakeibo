import {
  fetchProducts,
  finishTransaction,
  getAvailablePurchases,
  initConnection,
  endConnection,
  requestPurchase,
  type Product,
  type Purchase,
} from 'expo-iap';
import { Platform } from 'react-native';

/**
 * 買い切り課金（非消耗型）。
 *
 * 商品は1つだけ。RevenueCat のような仲介を挟まず Apple / Google と直接やり取りする。
 * このアプリは「データを外部に送信しない」ことを設計の前提にしているので、
 * 購入情報のためだけに第三者のサーバーを経由させたくない、という判断。
 *
 * 検証について:
 *   iOS は StoreKit 2 が端末内で署名検証済みの取引を返す。
 *   Android は Play から購入一覧を取得して照合する。
 *   いずれもサーバーを持たない構成なので、突破しようと思えば端末側で可能ではある。
 *   ¥500 の機能解放に対して自前の検証サーバーを建てる価値はないと判断している。
 */

/** App Store Connect / Play Console で作る商品ID。両ストアで同じIDを使う */
export const PRODUCT_ID = 'kakeibo_pro_unlock';

export interface ProductInfo {
  id: string;
  /** ストアが返す通貨込みの表示価格（「¥500」など）。自前で組み立てない */
  displayPrice: string;
  title: string;
}

let connected = false;

/** 課金の接続を開く。二重に呼ばれても1回だけ効く */
export async function connect(): Promise<void> {
  if (connected) return;
  await initConnection();
  connected = true;
}

export async function disconnect(): Promise<void> {
  if (!connected) return;
  await endConnection();
  connected = false;
}

/**
 * 価格はストアから取る。
 * 国や地域で価格が変わるうえ、こちらで「¥500」と書くと
 * ストア側の価格を変えたときに表示だけ食い違う。
 */
export async function loadProduct(): Promise<ProductInfo | null> {
  await connect();
  const products = await fetchProducts({
    skus: [PRODUCT_ID],
    type: 'in-app',
  });
  const product = (products as Product[]).find((p) => p.id === PRODUCT_ID);
  if (!product) return null;
  return {
    id: product.id,
    displayPrice: product.displayPrice ?? '',
    title: product.title ?? '',
  };
}

function ownsProduct(purchases: Purchase[]): boolean {
  return purchases.some((p) => p.productId === PRODUCT_ID);
}

/**
 * 購入済みかどうかをストアに問い合わせる。
 * 起動時と「復元」で使う。オフラインなどで失敗したら null を返し、
 * 呼び出し側は端末に保存した前回の結果を使う。
 */
export async function queryEntitlement(): Promise<boolean | null> {
  try {
    await connect();
    const purchases = await getAvailablePurchases();
    return ownsProduct(purchases as Purchase[]);
  } catch {
    return null;
  }
}

export type PurchaseResult =
  | { status: 'purchased' }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string };

/** 購入する。ユーザーがキャンセルした場合はエラーにしない */
export async function purchase(): Promise<PurchaseResult> {
  try {
    await connect();
    // 「platforms」は OS 側の区分（apple / google）で、ストア名ではない
    await requestPurchase({
      request:
        Platform.OS === 'ios'
          ? { apple: { sku: PRODUCT_ID } }
          : { google: { skus: [PRODUCT_ID] } },
      type: 'in-app',
    });

    // 購入直後の戻り値は端末やタイミングで形が変わるため、
    // 所持しているかは必ず購入一覧から確かめる
    const purchases = (await getAvailablePurchases()) as Purchase[];
    const owned = purchases.find((p) => p.productId === PRODUCT_ID);
    if (!owned) return { status: 'cancelled' };

    // 確定させないと iOS は起動のたびに再通知し、
    // Android は3日で自動返金される
    await finishTransaction({ purchase: owned, isConsumable: false });
    return { status: 'purchased' };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (/cancel/i.test(message)) return { status: 'cancelled' };
    return { status: 'failed', message };
  }
}

/**
 * 購入の復元。
 * 非消耗型ではこの導線が無いと Apple の審査でほぼ落ちるため、
 * 課金画面から必ず呼べるようにしておくこと。
 */
export async function restore(): Promise<boolean | null> {
  return queryEntitlement();
}
