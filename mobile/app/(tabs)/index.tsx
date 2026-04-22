import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';

import { mobileListingsApi } from '@/api/listings';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import type { Listing } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

export default function CatalogScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const [items, setItems] = useState<Listing[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (p: number, replace: boolean) => {
    const { data } = await mobileListingsApi.getAll({ page: p, limit: 20 });
    setTotalPages(data.meta.totalPages ?? 1);
    if (replace) {
      setItems(data.data);
    } else {
      setItems((prev) => [...prev, ...data.data]);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        await load(1, true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

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

  function renderItem({ item }: { item: Listing }) {
    const uri = item.images?.[0];
    return (
      <Pressable
        style={styles.card}
        onPress={() => router.push(`/listing/${item.id}`)}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbPlaceholder]} />
        )}
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.price}>
            {item.price != null ? `${item.price} ${item.currency ?? 'EUR'}` : '—'}
          </Text>
          <Text style={styles.city} numberOfLines={1}>
            {item.city}
          </Text>
        </View>
      </Pressable>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary[500]} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.4}
        ListEmptyComponent={
          <Text style={styles.empty}>{t('mobile.catalog.empty')}</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
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
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.text.primary },
  price: { marginTop: 4, fontSize: 16, color: colors.primary[700], fontWeight: '700' },
  city: { marginTop: 2, fontSize: 13, color: colors.text.secondary },
  empty: { textAlign: 'center', marginTop: 40, color: colors.text.secondary },
});
