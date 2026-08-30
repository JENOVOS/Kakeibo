import { create } from 'zustand';
import { KEYS, get as getSetting, set as setSetting } from '@/repositories/settings';

export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_LABELS: Record<ThemeMode, string> = {
  light: 'ライト',
  dark: 'ダーク',
  system: '端末の設定に合わせる',
};

interface ThemeState {
  mode: ThemeMode;
  /** 起動時に DB から読み込む */
  hydrate: () => Promise<void>;
  setMode: (mode: ThemeMode) => Promise<void>;
}

function parse(raw: string | null): ThemeMode {
  return raw === 'dark' || raw === 'system' ? raw : 'light';
}

/**
 * 表示テーマ。既定は **ライト**。
 *
 * 以前は端末の設定に追従していたが、端末をダークにしている人には
 * 常に暗い画面が出てしまい、スカイブルーを基調にした配色が意図どおりに見えなかった。
 * 既定をライトに固定し、ダークは設定から明示的に選ぶ形にしている。
 */
export const useThemeStore = create<ThemeState>((set) => ({
  mode: 'light',
  hydrate: async () => {
    set({ mode: parse(await getSetting(KEYS.themeMode)) });
  },
  setMode: async (mode) => {
    set({ mode });
    await setSetting(KEYS.themeMode, mode);
  },
}));
