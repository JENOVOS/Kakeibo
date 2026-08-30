import { StyleSheet, View } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';
import { radius, spacing } from '@/theme';

interface Props {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon = 'notebook-outline',
  title,
  description,
  actionLabel,
  onAction,
}: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <View
        style={[styles.badge, { backgroundColor: theme.colors.surfaceVariant }]}
      >
        <Icon source={icon} size={26} color={theme.colors.onSurfaceVariant} />
      </View>
      <Text variant="bodyMedium" style={styles.title}>
        {title}
      </Text>
      {description ? (
        <Text
          variant="bodySmall"
          style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
        >
          {description}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <Button mode="contained-tonal" onPress={onAction} style={styles.action}>
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    paddingVertical: spacing.xl + spacing.sm,
    paddingHorizontal: spacing.xxl,
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { marginTop: spacing.md, fontWeight: '600' },
  description: { textAlign: 'center', marginTop: spacing.xs },
  action: { marginTop: spacing.lg },
});
