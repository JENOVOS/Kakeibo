import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { cardShadow, radius, spacing } from '@/theme';

interface Props {
  title?: string;
  subtitle?: string;
  /** 見出し右端のアクション（「すべて見る ›」など） */
  action?: ReactNode;
  children: ReactNode;
  /** false にすると中身に左右パディングを付けない（リストを端まで敷きたいとき） */
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * 画面の構成要素はすべてこのカードに載せる。
 *
 * モック準拠: 白面・角丸18・ごく薄い影（0 1px 2px rgba(20,40,60,.06)）。
 * 影は単体では気づかない程度だが、淡い青灰の下地（#F2F6FA）から
 * カード面をわずかに持ち上げるのに効いている。
 */
export function AppCard({
  title,
  subtitle,
  action,
  children,
  padded = true,
  style,
}: Props) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.card,
        cardShadow,
        { backgroundColor: theme.colors.surface },
        style,
      ]}
    >
      {title || action ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? (
              <Text variant="titleSmall" style={styles.title}>
                {title}
              </Text>
            ) : null}
            {subtitle ? (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
          {action}
        </View>
      ) : null}
      <View
        style={
          padded
            ? [
                styles.body,
                { paddingTop: title || action ? 0 : spacing.lg },
              ]
            : undefined
        }
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md + 2,
    borderRadius: radius.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md + 2,
    paddingHorizontal: spacing.lg,
  },
  headerText: { flex: 1, gap: 2 },
  title: { fontWeight: '700', fontSize: 12.5 },
  body: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
