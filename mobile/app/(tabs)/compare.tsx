import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';

import { mobileListingsApi } from '@/api/listings';
import { MobileAppShell } from '@/components/layout/MobileAppShell';
import { AppButton } from '@/components/ui/AppButton';
import { Text } from '@/components/Themed';
import { useComparison } from '@/comparison/useComparison';
import { useI18n } from '@/i18n/I18nContext';
import type { Listing } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

type CompareTab = 'vehicles' | 'tires';

export default function CompareScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { vehicleIds, tireIds, remove } = useComparison();
  const [activeTab, setActiveTab] = useState<CompareTab>('vehicles');
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  const ids = activeTab === 'tires' ? tireIds : vehicleIds;

  const refresh = useCallback(async () => {
    setLoading(true);
    const rows: Listing[] = [];
    for (const lid of ids) {
      try {
        const { data } = await mobileListingsApi.getOne(lid);
        rows.push(data);
      } catch {
        continue;
      }
    }
    setItems(rows);
    setLoading(false);
  }, [ids]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const empty = (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{t('mobile.comparison.emptyTitle')}</Text>
      <Text style={styles.emptyHint}>{t('mobile.comparison.emptyHint')}</Text>
      <AppButton variant="search" onPress={() => router.push('/(tabs)')} style={styles.browseBtn}>
        {t('mobile.comparison.browse')}
      </AppButton>
    </View>
  );

  return (
    <MobileAppShell title={t('header.compare')}>
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === 'vehicles' && styles.tabActive]}
          onPress={() => setActiveTab('vehicles')}
        >
          <Text style={[styles.tabText, activeTab === 'vehicles' && styles.tabTextActive]}>
            {t('mobile.catalog.categoryVehicles')}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === 'tires' && styles.tabActive]}
          onPress={() => setActiveTab('tires')}
        >
          <Text style={[styles.tabText, activeTab === 'tires' && styles.tabTextActive]}>
            {t('mobile.catalog.categoryTires')}
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary[500]} />
      ) : items.length === 0 ? (
        empty
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.table}>
            {items.map((listing) => {
              const uri = listing.images?.[0];
              return (
                <View key={listing.id} style={styles.col}>
                  <Pressable onPress={() => router.push(`/listing/${listing.id}`)}>
                    {uri ? (
                      <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbPh]} />
                    )}
                    <Text style={styles.colTitle} numberOfLines={2}>
                      {listing.title}
                    </Text>
                    <Text style={styles.colPrice}>
                      {listing.price != null ? `${listing.price} ${listing.currency ?? 'MDL'}` : '—'}
                    </Text>
                  </Pressable>
                  <Pressable onPress={() => remove(listing.id, listing.category === 'tire')}>
                    <Text style={styles.remove}>{t('common.removeFromComparison')}</Text>
                  </Pressable>
                  <Text style={styles.spec}>{listing.city}</Text>
                  {listing.vehicle?.year ? (
                    <Text style={styles.spec}>
                      {t('listings.yearLabel')}: {listing.vehicle.year}
                    </Text>
                  ) : null}
                  {listing.vehicle?.mileage_km != null ? (
                    <Text style={styles.spec}>
                      {t('listings.mileageLabel')}: {listing.vehicle.mileage_km}
                    </Text>
                  ) : null}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginTop: 8,
    borderBottomWidth: 2,
    borderBottomColor: colors.divider,
  },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.primary[700], marginBottom: -2 },
  tabText: { fontSize: 14, color: colors.text.secondary },
  tabTextActive: { color: colors.primary[900], fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.primary[900], marginBottom: 8 },
  emptyHint: { fontSize: 14, color: colors.text.secondary, textAlign: 'center', marginBottom: 20 },
  browseBtn: { paddingHorizontal: 24 },
  table: { flexDirection: 'row', padding: 12, gap: 12 },
  col: {
    width: 200,
    borderWidth: 2,
    borderColor: `${colors.primary[500]}40`,
    borderRadius: 12,
    padding: 10,
    backgroundColor: colors.bg.partnerLogo,
  },
  thumb: { width: '100%', height: 120, borderRadius: 8 },
  thumbPh: { backgroundColor: colors.bg.darker },
  colTitle: { marginTop: 8, fontSize: 14, fontWeight: '600', color: colors.text.primary },
  colPrice: { marginTop: 4, fontSize: 15, fontWeight: '700', color: colors.primary[700] },
  remove: { marginTop: 8, color: colors.semantic.error, fontWeight: '600', fontSize: 13 },
  spec: { marginTop: 4, fontSize: 12, color: colors.text.secondary },
});
