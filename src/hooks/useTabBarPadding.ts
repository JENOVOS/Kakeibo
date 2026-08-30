import { useContext } from 'react';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { spacing } from '@/theme';

/**
 * タブ画面のスクロール下端に足す余白。
 *
 * タブバーは自前で描いており（中央の記録ボタンを持たせるため）、
 * ナビゲータが自動で内容に余白を入れてくれるとは限らない。
 * 実測の高さが取れればそれを、取れないうちは概算を返して
 * 最後の項目がバーに隠れないようにする。
 */
export function useTabBarPadding(): number {
  const height = useContext(BottomTabBarHeightContext);
  return (height ?? 76) + spacing.lg;
}
