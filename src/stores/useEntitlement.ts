import { create } from 'zustand';
import { KEYS, get as getSetting, set as setSetting } from '@/repositories/settings';
import * as purchases from '@/services/purchases';

interface EntitlementState {
  /** 買い切りを購入済みか */
  isPro: boolean;
  /** ストアへの問い合わせ中 */
  busy: boolean;
  /** 起動時に端末の控え → ストアの順で確かめる */
  hydrate: () => Promise<void>;
  purchase: () => Promise<purchases.PurchaseResult>;
  restore: () => Promise<'restored' | 'notFound' | 'failed'>;
}

async function persist(value: boolean): Promise<void> {
  await setSetting(KEYS.proUnlocked, value ? '1' : '0');
}

/**
 * 買い切りの所持状態。
 *
 * ストアへの問い合わせは通信を伴うので、結果を端末に控えておき、
 * 起動直後はまずその値で描く。オフラインでも購入者に広告が出たり
 * 貯金機能が閉じたりしないようにするため。
 *
 * 控えは「購入済み」を保つ方向にしか使わない。
 * ストアが「未購入」と答えたときだけ控えを false に更新する。
 * 通信できないだけで機能を取り上げてしまうと、返金でもないのに
 * 「買ったのに使えない」という最悪の体験になる。
 */
export const useEntitlement = create<EntitlementState>((set) => ({
  isPro: false,
  busy: false,

  hydrate: async () => {
    const cached = (await getSetting(KEYS.proUnlocked)) === '1';
    if (cached) set({ isPro: true });

    const owned = await purchases.queryEntitlement();
    if (owned === null) return; // 問い合わせ失敗。控えのまま
    set({ isPro: owned });
    await persist(owned);
  },

  purchase: async () => {
    set({ busy: true });
    try {
      const result = await purchases.purchase();
      if (result.status === 'purchased') {
        set({ isPro: true });
        await persist(true);
      }
      return result;
    } finally {
      set({ busy: false });
    }
  },

  restore: async () => {
    set({ busy: true });
    try {
      const owned = await purchases.restore();
      if (owned === null) return 'failed';
      set({ isPro: owned });
      await persist(owned);
      return owned ? 'restored' : 'notFound';
    } finally {
      set({ busy: false });
    }
  },
}));
