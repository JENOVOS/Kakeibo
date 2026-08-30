import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ActivityIndicator,
  Button,
  Icon,
  Snackbar,
  Text,
  useTheme,
} from 'react-native-paper';
import { AppCard } from '@/components/AppCard';
import { loadProduct, type ProductInfo } from '@/services/purchases';
import { useEntitlement } from '@/stores/useEntitlement';
import { fabShadow, headerGradient, radius, spacing } from '@/theme';

const FEATURES = [
  {
    icon: 'piggy-bank',
    title: '貯金機能',
    body: '目的・目標金額・目標日を決めて積み立て、達成率と到達見込みを確認できます。記録画面と固定費に貯金枠が追加されます。',
  },
  {
    icon: 'close-circle-outline',
    title: '広告の非表示',
    body: 'アプリ内の広告がすべて消えます。',
  },
];

/**
 * 買い切りの案内と購入。
 *
 * 「復元」は非消耗型では必須の導線。無いと Apple の審査でほぼ落ちる。
 * 機種変更や再インストール後に購入者が締め出されないためにも要る。
 */
export default function ProScreen() {
  const router = useRouter();
  const theme = useTheme();
  const isPro = useEntitlement((s) => s.isPro);
  const busy = useEntitlement((s) => s.busy);
  const buy = useEntitlement((s) => s.purchase);
  const restore = useEntitlement((s) => s.restore);

  const [product, setProduct] = useState<ProductInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const info = await loadProduct();
        if (!cancelled) setProduct(info);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleBuy() {
    const result = await buy();
    if (result.status === 'purchased') {
      setMessage('ありがとうございます。機能が使えるようになりました');
    } else if (result.status === 'failed') {
      setMessage(`購入できませんでした: ${result.message}`);
    }
  }

  async function handleRestore() {
    const result = await restore();
    setMessage(
      result === 'restored'
        ? '購入を復元しました'
        : result === 'notFound'
          ? 'このアカウントに購入履歴が見つかりませんでした'
          : 'ストアに接続できませんでした',
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <LinearGradient
          colors={[headerGradient[0], headerGradient[1]]}
          start={{ x: 0.15, y: 0 }}
          end={{ x: 0.85, y: 1 }}
          style={styles.hero}
        >
          <View style={[styles.heroIcon, fabShadow]}>
            <Icon source="star-four-points" size={30} color={headerGradient[1]} />
          </View>
          <Text variant="titleLarge" style={styles.heroTitle}>
            すべての機能を解放
          </Text>
          <Text variant="bodySmall" style={styles.heroSub}>
            一度の購入でずっと使えます。月額ではありません。
          </Text>
        </LinearGradient>

        {FEATURES.map((f) => (
          <AppCard key={f.title}>
            <View style={styles.feature}>
              <View
                style={[
                  styles.featureIcon,
                  { backgroundColor: theme.colors.primaryContainer },
                ]}
              >
                <Icon source={f.icon} size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.featureText}>
                <Text variant="bodyLarge" style={styles.featureTitle}>
                  {f.title}
                </Text>
                <Text
                  variant="bodySmall"
                  style={{ color: theme.colors.onSurfaceVariant }}
                >
                  {f.body}
                </Text>
              </View>
            </View>
          </AppCard>
        ))}

        {isPro ? (
          <AppCard>
            <View style={styles.owned}>
              <Icon
                source="check-circle"
                size={22}
                color={theme.colors.primary}
              />
              <Text variant="bodyMedium">購入済みです。ありがとうございます。</Text>
            </View>
          </AppCard>
        ) : (
          <View style={styles.actions}>
            {loading ? (
              <ActivityIndicator color={theme.colors.primary} />
            ) : (
              <>
                <Button
                  mode="contained"
                  onPress={() => void handleBuy()}
                  loading={busy}
                  disabled={busy || product === null}
                  style={styles.buy}
                  contentStyle={styles.buyContent}
                >
                  {product
                    ? `${product.displayPrice} で購入`
                    : 'ストアに接続できません'}
                </Button>
                {product === null ? (
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.note,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    通信状況を確認して、開き直してください。
                  </Text>
                ) : null}
              </>
            )}

            {/* 非消耗型では必須の導線。機種変更や再インストール後に使う */}
            <Button
              mode="text"
              onPress={() => void handleRestore()}
              disabled={busy}
              style={styles.restore}
            >
              購入を復元
            </Button>
          </View>
        )}

        <Text
          variant="bodySmall"
          style={[styles.legal, { color: theme.colors.onSurfaceVariant }]}
        >
          買い切りの追加機能です。購入は Apple / Google のアカウントに紐づき、
          同じアカウントなら機種変更後も「購入を復元」から引き継げます。
        </Text>

        <Button mode="text" onPress={() => router.back()} style={styles.close}>
          閉じる
        </Button>
      </ScrollView>

      <Snackbar
        visible={message !== null}
        onDismiss={() => setMessage(null)}
        duration={4000}
      >
        {message ?? ''}
      </Snackbar>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingBottom: spacing.xl },
  hero: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  heroIcon: {
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: { color: '#FFFFFF', fontWeight: '700' },
  heroSub: { color: 'rgba(255,255,255,.9)', textAlign: 'center' },
  feature: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1, gap: 3 },
  featureTitle: { fontWeight: '700' },
  owned: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actions: { paddingHorizontal: spacing.lg, gap: spacing.xs },
  buy: { borderRadius: radius.md },
  buyContent: { paddingVertical: spacing.sm },
  note: { textAlign: 'center' },
  restore: { marginTop: spacing.xs },
  legal: {
    paddingHorizontal: spacing.xl,
    marginTop: spacing.lg,
    textAlign: 'center',
    lineHeight: 18,
  },
  close: { marginTop: spacing.sm },
});
