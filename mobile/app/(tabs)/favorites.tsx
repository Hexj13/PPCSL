import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { mobileFavoritesApi } from '@/api/favorites';
import { getApiErrorMessage } from '@/api/getApiErrorMessage';
import { useAuth } from '@/auth/AuthContext';
import { AuthRequiredScreen } from '@/components/auth/AuthRequiredScreen';
import { MobileAppShell } from '@/components/layout/MobileAppShell';
import { ListingCard } from '@/components/listing/ListingCard';
import { SavedFiltersList } from '@/components/search/SavedFiltersList';
import { showToast } from '@/components/providers/ToastProvider';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import type { FavoriteItem } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

type FavoritesTab = 'listings' | 'filters';

export default function FavoritesScreen() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<FavoritesTab>('listings');
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

  async function removeFavorite(listingId: string) {
    try {
      await mobileFavoritesApi.remove(listingId);
      setItems((prev) => prev.filter((f) => f.listing.id !== listingId));
      showToast('success', t('common.success'));
    } catch (err) {
      showToast('error', getApiErrorMessage(err, t('common.error')));
    }
  }

  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  if (!user) {
    return (
      <MobileAppShell title={t('header.favorites')}>
        <AuthRequiredScreen titleKey="mobile.favorites.needAuth" />
      </MobileAppShell>
    );
  }

  return (
    <MobileAppShell title={t('header.favorites')}>
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'listings' && styles.tabActive]}
          onPress={() => setActiveTab('listings')}
        >
          <Text style={[styles.tabText, activeTab === 'listings' && styles.tabTextActive]}>
            {t('favorites.listings')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'filters' && styles.tabActive]}
          onPress={() => setActiveTab('filters')}
        >
          <Text style={[styles.tabText, activeTab === 'filters' && styles.tabTextActive]}>
            {t('favorites.filters')}
          </Text>
        </Pressable>
      </View>

      {activeTab === 'filters' ? (
        <SavedFiltersList
          onApplied={() => {
            router.push('/(tabs)');
          }}
        />
      ) : loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary[500]} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.listing.id}
          ListEmptyComponent={<Text style={styles.empty}>{t('mobile.favorites.empty')}</Text>}
          renderItem={({ item }) => (
            <ListingCard
              listing={item.listing}
              onPress={() => router.push(`/listing/${item.listing.id}`)}
              favorite
              onToggleFavorite={() => removeFavorite(item.listing.id)}
            />
          )}
        />
      )}
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.divider,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary[700], marginBottom: -2 },
  tabText: { fontSize: 14, color: colors.text.secondary, fontWeight: '500' },
  tabTextActive: { color: colors.primary[900], fontWeight: '700' },
  empty: { textAlign: 'center', marginTop: 40, color: colors.text.secondary },
});
