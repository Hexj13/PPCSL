import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { mobileFavoritesApi } from '@/api/favorites';
import { useAuth } from '@/auth/AuthContext';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import type { FavoriteItem } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

export default function FavoritesScreen() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    const { data } = await mobileFavoritesApi.getPage(1, 50);
    setItems(data.data);
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (authLoading) return;
      setLoading(true);
      try {
        await refresh();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, refresh]);

  if (authLoading || loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>{t('mobile.favorites.needAuth')}</Text>
        <Pressable style={styles.btn} onPress={() => router.push('/auth/sign-in')}>
          <Text style={styles.btnText}>{t('mobile.auth.signIn')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.listing.id}
        ListEmptyComponent={
          <Text style={styles.empty}>{t('mobile.favorites.empty')}</Text>
        }
        renderItem={({ item }) => {
          const l = item.listing;
          const uri = l.images?.[0];
          return (
            <Pressable style={styles.card} onPress={() => router.push(`/listing/${l.id}`)}>
              {uri ? (
                <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )}
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {l.title}
                </Text>
                <Text style={styles.price}>
                  {l.price != null ? `${l.price} ${l.currency ?? 'EUR'}` : '—'}
                </Text>
              </View>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  hint: { textAlign: 'center', color: colors.text.secondary, marginBottom: 16 },
  btn: { backgroundColor: colors.primary[500], paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  btnText: { color: '#fff', fontWeight: '600' },
  card: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginVertical: 6,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.divider,
  },
  thumb: { width: 120, height: 90 },
  thumbPlaceholder: { backgroundColor: colors.bg.darker },
  cardBody: { flex: 1, padding: 10, justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  price: { marginTop: 4, fontSize: 16, color: colors.primary[700], fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, color: colors.text.secondary },
});
