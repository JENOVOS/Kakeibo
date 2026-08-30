import { TextInput } from 'react-native-paper';
import type { ComponentProps } from 'react';

type PaperTextInputProps = ComponentProps<typeof TextInput>;

interface Props extends Omit<PaperTextInputProps, 'value' | 'defaultValue'> {
  /** 入力欄に最初に入れておく文字列 */
  initialValue?: string;
  /**
   * この値が変わったときだけ、入力欄の中身を initialValue で差し替える。
   * ダイアログを開いた、DB から読み込んだ、といった「外から入れ直す」場面で使う。
   */
  resetKey?: string | number;
}

/**
 * 日本語入力（IME）で安全に使えるテキスト入力。
 *
 * ■ なぜ value を渡さないのか
 *
 * React Native の TextInput に `value` を渡して制御コンポーネントにすると、
 * onChangeText → setState → 再描画で value を書き戻す、という流れになる。
 * これが日本語入力の「未確定文字（marked text）」を壊す。
 *
 * とくにトグル入力（「か」を連打して か→き→く と送る打ち方）では、
 * 送っている最中の文字はまだ未確定の状態にある。そこへ JS 側から値を書き戻すと
 * OS は未確定文字をいったん確定させてしまうため、連打するたびに送りではなく
 * 新しい文字の追加になり「かかか」のように増えていく。
 *
 * そこで value ではなく defaultValue を渡し、入力中の文字列は OS 側に任せる。
 * Paper の TextInput は value が undefined なら内部状態で動く作りになっていて、
 * ラベルの浮き上がりなども従来どおり機能する。
 * 呼び出し側は onChangeText で受け取った値を検証や保存に使えばよく、
 * その state を入力欄へ戻す必要はない。
 *
 * ■ 中身を差し替えたいとき
 *
 * defaultValue はマウント時にしか読まれないので、resetKey を変えて作り直す。
 *
 * ■ maxLength を付けない理由
 *
 * iOS の maxLength は入力途中の文字列を切り詰めるため、これも未確定文字を壊す。
 * 長さの制限は保存時（repositories 側）で行う。
 */
export function TextField({ initialValue = '', resetKey, ...rest }: Props) {
  return (
    <TextInput
      key={String(resetKey ?? '')}
      defaultValue={initialValue}
      {...rest}
    />
  );
}
