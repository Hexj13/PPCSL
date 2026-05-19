import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { mobileFavoritesApi } from '@/api/favorites';
import { mobileListingsApi } from '@/api/listings';
import {
  defaultCatalogSearchParams,
  useMobileCatalogSearch,
} from '@/catalog/MobileCatalogSearchContext';
import { hasActiveCatalogFilters } from '@/catalog/hasActiveCatalogFilters';
import { useAuth } from '@/auth/AuthContext';
import { MobileAppShell } from '@/components/layout/MobileAppShell';
import { ListingCard } from '@/components/listing/ListingCard';
import { Text } from '@/components/Themed';
import { useComparison } from '@/comparison/useComparison';
import { buildSignInHref, setAuthReturnPath } from '@/auth/returnPath';
import { useI18n } from '@/i18n/I18nContext';
import { cleanSearchParams } from '@/lib/cleanSearchParams';
import type { Listing, SearchParams } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

const LIMIT = 20;

export default function CatalogScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { committedFilters, setCommittedFilters } = useMobileCatalogSearch();
  const { check, toggle } = useComparison();
  const [items, setItems] = useState<Listing[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const filterSignature = useMemo(() => JSON.stringify(committedFilters), [committedFilters]);
  const catalogKind = committedFilters.category === 'tire' ? 'tire' : 'vehicle';
  const hasExtraFilters = useMemo(
    () => hasActiveCatalogFilters(committedFilters),
    [committedFilters],
  );

  const load = useCallback(
    async (p: number, replace: boolean) => {
      const params = cleanSearchParams({
        ...(committedFilters ?? defaultCatalogSearchParams('vehicle')),
        page: p,
        limit: LIMIT,
      });
      const { data } = await mobileListingsApi.getAll(params);
      setTotalPages(data.meta.totalPages ?? 1);
      if (replace) setItems(data.data);
      else setItems((prev) => [...prev, ...data.data]);
    },
    [committedFilters],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPage(1);
      try {
        await load(1, true);
        if (user) {
          const { data } = await mobileFavoritesApi.getPage(1, 100);
          if (!cancelled) {
            setFavoriteIds(new Set(data.data.map((f) => f.listing.id)));
          }
        } else if (!cancelled) {
          setFavoriteIds(new Set());
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [filterSignature, load, user]);

  async function onRefresh() {
    setRefreshing(true);
    setPage(1);
    try {
      await load(1, true);
    } finally {
      setRefreshing(false);
    }
  }

  async function loadMore() {
    if (page >= totalPages) return;
    const next = page + 1;
    setPage(next);
    await load(next, false);
  }

  function openFilterTab() {
    router.push('/(tabs)/filter');
  }

  function switchCatalogKind(kind: 'vehicle' | 'tire') {
    setCommittedFilters(defaultCatalogSearchParams(kind));
  }

  async function onToggleFavorite(listingId: string) {
    if (!user) {
      await setAuthReturnPath('/');
      router.push(buildSignInHref('/') as '/auth/sign-in');
      return;
    }
    if (favoriteIds.has(listingId)) {
      await mobileFavoritesApi.remove(listingId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
    } else {
      await mobileFavoritesApi.add(listingId);
      setFavoriteIds((prev) => new Set(prev).add(listingId));
    }
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <View style={styles.categoryRow}>
        <Pressable
          style={[styles.catChip, catalogKind === 'vehicle' && styles.catChipActive]}
          onPress={() => switchCatalogKind('vehicle')}
        >
          <Text style={[styles.catChipText, catalogKind === 'vehicle' && styles.catChipTextActive]}>
            {t('mobile.catalog.categoryVehicles')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.catChip, catalogKind === 'tire' && styles.catChipActive]}
          onPress={() => switchCatalogKind('tire')}
        >
          <Text style={[styles.catChipText, catalogKind === 'tire' && styles.catChipTextActive]}>
            {t('mobile.catalog.categoryTires')}
          </Text>
        </Pressable>
      </View>
      <Pressable style={styles.filterBtn} onPress={openFilterTab}>
        <Text style={styles.filterBtnText}>{t('mobile.catalog.filters')}</Text>
        {hasExtraFilters ? <View style={styles.filterBadge} /> : null}
      </Pressable>
    </View>
  );

  return (
    <MobileAppShell title={t('mobile.catalog.title')}>
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary[500]} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => (
            <ListingCard
              listing={item}
              onPress={() => router.push(`/listing/${item.id}`)}
              favorite={favoriteIds.has(item.id)}
              inComparison={check(item.id, item.category === 'tire')}
              onToggleFavorite={() => onToggleFavorite(item.id)}
              onToggleCompare={() => toggle(item.id, item.category === 'tire')}
            />
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListEmptyComponent={<Text style={styles.empty}>{t('mobile.catalog.empty')}</Text>}
        />
      )}
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerBlock: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10, gap: 10 },
  categoryRow: { flexDirection: 'row', gap: 8 },
  catChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.divider,
    backgroundColor: colors.bg.partnerLogo,
    alignItems: 'center',
  },
  catChipActive: {
    borderColor: colors.primary[700],
    backgroundColor: `${colors.primary[500]}1A`,
  },
  catChipText: { fontSize: 14, fontWeight: '600', color: colors.text.secondary },
  catChipTextActive: { color: colors.primary[900] },
  filterBtn: {
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.primary[700],
    backgroundColor: `${colors.primary[500]}1F`,
    alignItems: 'center',
    position: 'relative',
  },
  filterBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary[900] },
  filterBadge: {
    position: 'absolute',
    top: 8,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.semantic.error,
  },
  empty: { textAlign: 'center', marginTop: 40, color: colors.text.secondary },
});
