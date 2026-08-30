import { Platform, type TextStyle } from 'react-native';
import { MD3DarkTheme, MD3LightTheme, type MD3Theme } from 'react-native-paper';

/**
 * 配色・書体・形は Claude Design のモック（docs/家計簿アプリのUIモック-handoff）を出典とする。
 * ライトの値はモックの実測値をそのまま持ち込んでいる。
 * モックはライト専用なので、ダークは同じ役割割り当てで別途組んである
 * （ダークモード対応は既存機能なので落とさない）。
 */

/** モックのアクセント（テーマ「スカイブルー」） */
const accent = {
  base: '#1B90D6',
  lite: '#3BA6E4',
  deep: '#0E6FAF',
  soft: '#E8F4FC',
  soft2: '#9BD0EE',
};

/** ヘッダーのグラデーション（linear-gradient(160deg, lite, deep)） */
export const headerGradient = [accent.lite, accent.deep] as const;

const ink = {
  /** 見出し・金額 */
  strong: '#17232E',
  /** 本文 */
  body: '#3C4B58',
  /** 補助 */
  sub: '#5A6874',
  /** 弱い補助 */
  muted: '#7B8896',
  /** さらに弱い（単位・％など） */
  faint: '#8E9BA7',
  /** プレースホルダ・空状態 */
  placeholder: '#A9B6C2',
};

const surface = {
  screen: '#F2F6FA',
  card: '#FFFFFF',
  /** 入力欄・チップの下地 */
  subtle: '#EDF2F6',
  /** バーのトラック */
  track: '#EEF2F6',
  border: '#E4EBF1',
  divider: '#F1F5F9',
};

/** 余白と角丸は必ずここから取る。画面ごとに数値を直書きしない */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  /** 入力欄・小さめの面 */
  md: 12,
  /** グループカード・ダイアログ */
  lg: 16,
  /** カード */
  card: 18,
  /** グループカード（lg の別名） */
  group: 16,
  /** 大きめのダイアログ */
  xl: 24,
  pill: 999,
} as const;

/**
 * 数値は Manrope（tabular）。日本語は端末の既定フォント。
 *
 * モックは日本語に Noto Sans JP を指定しているが、これは数MB あり
 * アプリの容量を大きく押し上げる。iOS / Android の既定和文フォントは
 * ヒラギノ / Noto Sans JP なので、実機での見た目はほぼ変わらない。
 * 一方 Manrope は欧文のみで軽く、金額表示の印象を決める部分なので入れている。
 */
export const font = {
  numeric: 'Manrope_800ExtraBold',
  numericBold: 'Manrope_700Bold',
  numericSemi: 'Manrope_600SemiBold',
  numericMedium: 'Manrope_500Medium',
} as const;

/** 金額表示に必ず付ける（桁が揃わないと家計簿は読みにくい） */
export const tabular: TextStyle = {
  fontVariant: ['tabular-nums'],
};

/** モックのカード影: 0 1px 2px rgba(20,40,60,.06) */
export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#142838',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
  },
  android: { elevation: 1 },
  default: {},
});

/** 中央の記録ボタン: 0 8px 18px rgba(14,111,175,.36) */
export const fabShadow = Platform.select({
  ios: {
    shadowColor: accent.deep,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 18,
  },
  android: { elevation: 8 },
  default: {},
});

export const lightTheme: MD3Theme = {
  ...MD3LightTheme,
  roundness: radius.md,
  colors: {
    ...MD3LightTheme.colors,
    primary: accent.base,
    onPrimary: '#FFFFFF',
    primaryContainer: accent.soft,
    onPrimaryContainer: accent.deep,
    secondary: ink.sub,
    onSecondary: '#FFFFFF',
    secondaryContainer: accent.soft,
    onSecondaryContainer: accent.deep,
    tertiary: accent.lite,
    background: surface.screen,
    onBackground: ink.strong,
    surface: surface.card,
    onSurface: ink.strong,
    surfaceVariant: surface.subtle,
    onSurfaceVariant: ink.muted,
    surfaceDisabled: surface.track,
    onSurfaceDisabled: ink.placeholder,
    outline: ink.placeholder,
    outlineVariant: surface.border,
    error: '#D9603F',
    elevation: {
      level0: 'transparent',
      level1: surface.card,
      level2: surface.card,
      level3: surface.card,
      level4: surface.card,
      level5: surface.card,
    },
  },
};

export const darkTheme: MD3Theme = {
  ...MD3DarkTheme,
  roundness: radius.md,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#5FBAF0',
    onPrimary: '#04121C',
    primaryContainer: '#123449',
    onPrimaryContainer: '#CDE9FA',
    secondary: '#9FB0BE',
    onSecondary: '#04121C',
    secondaryContainer: '#123449',
    onSecondaryContainer: '#CDE9FA',
    tertiary: accent.lite,
    background: '#0D151C',
    onBackground: '#E8EEF3',
    surface: '#141F29',
    onSurface: '#E8EEF3',
    surfaceVariant: '#1D2A35',
    onSurfaceVariant: '#94A5B3',
    surfaceDisabled: '#1D2A35',
    onSurfaceDisabled: '#5C6B78',
    outline: '#5C6B78',
    outlineVariant: '#25333F',
    error: '#F08A6E',
    elevation: {
      level0: 'transparent',
      level1: '#141F29',
      level2: '#17232E',
      level3: '#1A2732',
      level4: '#1C2A36',
      level5: '#1E2D3A',
    },
  },
};

/**
 * テーマに含めない意味の色。
 * 「赤 = 出ていく / 緑 = 入ってくる」は意味が固定されており、
 * テーマカラーを変えても入れ替わってはいけない。
 *
 * モックでは支出額を黒（#17232E）、収入を緑（#16A37B）で出しているが、
 * このアプリは収支を並置する画面が多く、支出も色で判別できる必要があるため
 * 支出には超過色（#D9603F）を割り当てている。
 */
export const semantic = {
  expense: '#D9603F',
  expenseDark: '#F08A6E',
  income: '#16A37B',
  incomeDark: '#4FD3A8',
  /** 貯金は「出ていく」でも「入ってくる」でもないので、アクセント寄りの別色 */
  savings: '#2F7FC4',
  savingsDark: '#6FB6EA',
  warning: '#D98C3F',
  warningDark: '#F0B36E',
  /** 曜日の色（モックのカレンダー準拠） */
  sunday: '#D9603F',
  saturday: '#3E7FB8',
};

export function amountColor(
  type: 'expense' | 'income' | 'savings',
  dark: boolean,
): string {
  if (type === 'income') return dark ? semantic.incomeDark : semantic.income;
  if (type === 'savings') return dark ? semantic.savingsDark : semantic.savings;
  return dark ? semantic.expenseDark : semantic.expense;
}

/** 金額の前に付ける符号。貯金は出入りではなく取り置きなので符号を付けない */
export function amountSign(type: 'expense' | 'income' | 'savings'): string {
  if (type === 'income') return '+';
  if (type === 'savings') return '';
  return '−';
}

/** 予算の消化率に応じた色。色だけに頼らず、画面側で数値も必ず併記すること */
export function budgetColor(ratio: number, dark: boolean): string {
  if (ratio >= 1) return dark ? semantic.expenseDark : semantic.expense;
  if (ratio >= 0.8) return dark ? semantic.warningDark : semantic.warning;
  return dark ? semantic.incomeDark : semantic.income;
}

/**
 * カテゴリのアイコンタイルは角丸の正方形（モック準拠）。
 * 角丸は辺の約 1/3。サイズを変えても比率が保たれるよう関数にしてある。
 */
export function tileRadius(size: number): number {
  return Math.round(size * 0.32);
}

/**
 * カテゴリ色。モックは oklch 指定だが React Native は oklch を解釈しないため、
 * 同じ色相・彩度・明度の並びを 16 進で置いてある（モックの10色 + 拡張）。
 */
export const CATEGORY_COLORS = [
  '#3E8FD6',
  '#2FA3B8',
  '#5B7BE0',
  '#9B6FD8',
  '#2FA37B',
  '#D9A03F',
  '#2F92C4',
  '#D9603F',
  '#D065A0',
  '#7C8A99',
  '#4FA85C',
  '#E07A3F',
  '#C9553F',
  '#8A6FD8',
  '#3FA8A0',
  '#D64F7A',
  '#6E8F3F',
  '#5C6B78',
] as const;

/**
 * カテゴリ用アイコン（MaterialCommunityIcons）。
 *
 * 名前は実在するものだけを載せること。存在しない名前を書くと
 * 実行時に代替が出るだけで、型でもビルドでも気づけない。
 * 追加したら node_modules の glyphmap で実在を確認する:
 *   node -e "const g=require('./node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/MaterialCommunityIcons.json'); console.log('icon-name' in g)"
 */
export interface IconGroup {
  label: string;
  icons: readonly string[];
}

export const ICON_GROUPS: readonly IconGroup[] = [
  {
    label: '食費・飲み物',
    icons: [
      'silverware-fork-knife', 'food', 'noodles', 'rice', 'bread-slice',
      'hamburger', 'pizza', 'fish', 'egg', 'carrot', 'food-apple',
      'cake-variant', 'ice-cream', 'coffee', 'tea', 'beer', 'glass-wine',
      'cup-water', 'food-croissant', 'silverware-variant',
    ],
  },
  {
    label: '買い物',
    icons: [
      'cart', 'shopping', 'basket', 'store', 'storefront', 'tag', 'sale',
      'gift', 'package-variant', 'truck-delivery',
    ],
  },
  {
    label: '住まい',
    icons: [
      'home', 'home-city', 'sofa', 'bed', 'lightbulb-on', 'water', 'flash',
      'fire', 'air-conditioner', 'washing-machine', 'broom', 'hammer-wrench',
      'key-variant', 'toilet', 'shower',
    ],
  },
  {
    label: '交通',
    icons: [
      'train', 'subway-variant', 'bus', 'taxi', 'car', 'car-hatchback',
      'motorbike', 'bicycle', 'walk', 'airplane', 'ferry', 'gas-station',
      'parking', 'ticket', 'highway',
    ],
  },
  {
    label: '通信・IT',
    icons: [
      'cellphone', 'wifi', 'laptop', 'monitor', 'router-wireless', 'sim',
      'email', 'phone', 'printer', 'cloud',
    ],
  },
  {
    label: '健康',
    icons: [
      'medical-bag', 'hospital-box', 'pill', 'tooth-outline', 'heart-pulse',
      'glasses', 'dumbbell', 'yoga', 'run', 'spa',
    ],
  },
  {
    label: '美容・衣類',
    icons: [
      'tshirt-crew', 'hanger', 'shoe-formal', 'shoe-sneaker', 'hair-dryer',
      'lipstick', 'content-cut', 'watch', 'sunglasses', 'bag-personal',
    ],
  },
  {
    label: '趣味・娯楽',
    icons: [
      'movie-open', 'gamepad-variant', 'music', 'headphones',
      'book-open-variant', 'palette', 'camera', 'television-classic',
      'ticket-confirmation', 'guitar-acoustic', 'cards-playing',
      'microphone-variant', 'drama-masks', 'puzzle', 'soccer', 'baseball',
      'golf', 'swim', 'ski', 'tent', 'beach', 'flower-tulip', 'pine-tree',
    ],
  },
  {
    label: '学び・仕事',
    icons: [
      'school', 'book-education-outline', 'pencil', 'notebook', 'translate',
      'certificate', 'briefcase', 'office-building', 'account-tie',
      'clipboard-text',
    ],
  },
  {
    label: '家族・暮らし',
    icons: [
      'baby-carriage', 'human-male-female-child', 'dog', 'cat', 'paw', 'tree',
      'sprout', 'church', 'hand-heart', 'account-group', 'calendar-heart',
    ],
  },
  {
    label: 'お金',
    icons: [
      'cash', 'cash-multiple', 'credit-card', 'bank', 'wallet', 'piggy-bank',
      'chart-line', 'receipt', 'currency-jpy', 'safe', 'hand-coin',
      'cash-refund', 'calculator', 'scale-balance', 'trending-up',
      'trending-down', 'percent', 'bank-transfer',
    ],
  },
  {
    label: 'その他',
    icons: [
      'shape', 'dots-horizontal', 'star', 'heart', 'alert-circle',
      'help-circle', 'bookmark', 'label', 'binoculars', 'ticket-percent',
    ],
  },
];

/** 全アイコンの平坦なリスト（既定値の参照などに使う） */
export const CATEGORY_ICONS = ICON_GROUPS.flatMap((g) => g.icons);
