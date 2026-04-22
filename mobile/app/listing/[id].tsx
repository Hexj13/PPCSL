import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { mobileFavoritesApi } from '@/api/favorites';
import { mobileListingsApi } from '@/api/listings';
import { useAuth } from '@/auth/AuthContext';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import type { Listing } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

const { width } = Dimensions.get('window');

export default function ListingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useI18n();
  const { user } = useAuth();
  const router = useRouter();
  const [listing, setListing] = useState<Listing | null>(null);
  const [favorite, setFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!id) return;
    const { data } = await mobileListingsApi.getOne(id);
    setListing(data);
    if (user) {
      try {
        const chk = await mobileFavoritesApi.check(id);
        setFavorite(chk.data.isFavorite);
      } catch {
        setFavorite(false);
      }
    }
  }, [id, user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
  }, [refresh]);

  async function toggleFavorite() {
    if (!user || !id) {
      router.push('/auth/sign-in');
      return;
    }
    if (favorite) {
      await mobileFavoritesApi.remove(id);
      setFavorite(false);
    } else {
      await mobileFavoritesApi.add(id);
      setFavorite(true);
    }
  }

  if (loading || !listing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  const imgs = listing.images ?? [];

  return (
    <ScrollView style={styles.container}>
      <ScrollView horizontal pagingEnabled style={styles.gallery}>
        {imgs.length ? (
          imgs.map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width, height: 240 }} contentFit="cover" />
          ))
        ) : (
          <View style={[styles.heroPlaceholder, { width }]} />
        )}
      </ScrollView>
      <View style={styles.body}>
        <Text style={styles.title}>{listing.title}</Text>
        <Text style={styles.price}>
          {listing.price != null ? `${listing.price} ${listing.currency ?? 'EUR'}` : '—'}
        </Text>
        <Text style={styles.meta}>
          {t('mobile.listing.city')}: {listing.city}
        </Text>
        {listing.description ? <Text style={styles.desc}>{listing.description}</Text> : null}
        <View style={styles.actions}>
          <Pressable style={styles.btnSecondary} onPress={toggleFavorite}>
            <Text style={styles.btnSecondaryText}>
              {favorite ? t('mobile.listing.favoriteRemove') : t('mobile.listing.favoriteAdd')}
            </Text>
          </Pressable>
          {listing.user?.phone ? (
            <Pressable
              style={styles.btnPrimary}
              onPress={() => Linking.openURL(`tel:${listing.user?.phone}`)}
            >
              <Text style={styles.btnPrimaryText}>{t('mobile.listing.callSeller')}</Text>
            </Pressable>
          ) : null}
          {user && listing.user?.id === user.id ? (
            <Pressable
              style={styles.btnPrimary}
              onPress={() => router.push({ pathname: '/(tabs)/create', params: { editId: listing.id } })}
            >
              <Text style={styles.btnPrimaryText}>{t('common.edit')}</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  gallery: { maxHeight: 240 },
  heroPlaceholder: { height: 240, backgroundColor: colors.bg.darker },
  body: { padding: 16 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text.primary },
  price: { marginTop: 8, fontSize: 22, fontWeight: '700', color: colors.primary[700] },
  meta: { marginTop: 8, color: colors.text.secondary },
  desc: { marginTop: 12, fontSize: 15, color: colors.text.primary, lineHeight: 22 },
  actions: { marginTop: 20, gap: 10 },
  btnPrimary: {
    backgroundColor: colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.primary[700], fontWeight: '600' },
});
