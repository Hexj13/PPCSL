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
import { buildSignInHref, setAuthReturnPath } from '@/auth/returnPath';
import { HeartIcon, ScaleIcon } from '@/components/icons';
import { Text } from '@/components/Themed';
import { useComparison } from '@/comparison/useComparison';
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
  const { check, toggle } = useComparison();

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
    } else {
      setFavorite(false);
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
      await setAuthReturnPath(`/listing/${id}`);
      router.push(buildSignInHref(`/listing/${id}`) as '/auth/sign-in');
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

  async function toggleComparison() {
    if (!id || !listing) return;
    await toggle(id, listing.category === 'tire');
  }

  const inComparison = listing ? check(listing.id, listing.category === 'tire') : false;

  if (loading || !listing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  const imgs = listing.images ?? [];
  const v = listing.vehicle;
  const tire = listing.tire;

  function specRow(label: string, value: string | undefined | null) {
    if (value == null || value === '') return null;
    return (
      <View style={styles.specRow} key={`${label}:${value}`}>
        <Text style={styles.specLabel}>{label}</Text>
        <Text style={styles.specValue}>{value}</Text>
      </View>
    );
  }

  function boolSpec(label: string, value: boolean | null | undefined) {
    if (value == null) return null;
    return specRow(label, value ? t('listingDetail.tireYes') : t('listingDetail.tireNo'));
  }

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
        {v ? (
          <View style={styles.specsBlock}>
            <Text style={styles.specsTitle}>{t('mobile.listing.specsTitle')}</Text>
            {specRow(t('listings.brandLabel'), v.brand?.name)}
            {specRow(t('listings.modelLabel'), v.model?.name)}
            {specRow(t('listings.yearLabel'), String(v.year))}
            {specRow(
              t('listings.mileageLabel'),
              v.mileage_km != null ? `${v.mileage_km} ${t('listings.km')}` : undefined,
            )}
            {specRow(t('listings.fuelLabel'), v.fuel)}
            {specRow(t('listings.transmissionLabel'), v.transmission)}
            {specRow(t('listings.driveTypeLabel'), v.drive_type)}
            {specRow(t('listings.bodyTypeLabel'), v.body_type)}
            {specRow(
              t('listings.engineDisplacementLabel'),
              v.engine_displ_l != null ? String(v.engine_displ_l) : undefined,
            )}
            {specRow(t('listings.colorLabel'), v.color)}
            {specRow(t('vehicleOptions.doorsLabel'), v.doors != null ? String(v.doors) : undefined)}
          </View>
        ) : null}
        {tire ? (
          <View style={styles.specsBlock}>
            <Text style={styles.specsTitle}>{t('mobile.listing.tireSpecsTitle')}</Text>
            {specRow(t('listings.brandLabel'), tire.brand?.name)}
            {specRow(t('listings.modelLabel'), tire.model?.name ?? undefined)}
            {specRow(
              t('listingDetail.tireVehicleType'),
              t(`searchFilters.tireVehicleType.${tire.tire_vehicle_type}`),
            )}
            {specRow(t('listingDetail.tireSize'), `${tire.width_mm}/${tire.aspect_ratio} R${tire.diameter_inch}`)}
            {specRow(t('listingDetail.tireTread'), t(`searchFilters.tireTreadOption.${tire.season}`))}
            {specRow(t('listingDetail.tireCondition'), t(`searchFilters.tireConditionOption.${tire.condition}`))}
            {specRow(t('listingDetail.tireQuantity'), String(tire.quantity))}
            {specRow(t('listingDetail.tireLoadIndex'), tire.load_index ?? undefined)}
            {specRow(t('listingDetail.tireSpeedIndex'), tire.speed_index ?? undefined)}
            {boolSpec(t('listingDetail.tireStudded'), tire.studded)}
            {boolSpec(t('listingDetail.tireRunFlat'), tire.run_flat)}
            {boolSpec(t('listingDetail.tireReinforcedXl'), tire.reinforced_xl)}
            {boolSpec(t('listingDetail.tireSpareDonut'), tire.spare_donut)}
            {boolSpec(t('listingDetail.tireTubeless'), tire.tubeless)}
            {boolSpec(t('listingDetail.tireAcoustic'), tire.acoustic)}
          </View>
        ) : null}
        {listing.description ? <Text style={styles.desc}>{listing.description}</Text> : null}
        <View style={styles.actions}>
          <Pressable style={styles.iconAction} onPress={toggleFavorite}>
            <HeartIcon size={24} color={favorite ? colors.semantic.error : colors.primary[700]} />
          </Pressable>
          <Pressable style={styles.iconAction} onPress={toggleComparison}>
            <ScaleIcon
              size={24}
              color={inComparison ? colors.primary[500] : colors.primary[700]}
            />
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
  specsBlock: {
    marginTop: 16,
    padding: 14,
    borderRadius: 10,
    backgroundColor: colors.bg.partnerLogo,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  specsTitle: { fontSize: 16, fontWeight: '700', color: colors.text.primary, marginBottom: 10 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  specLabel: { flex: 1, fontSize: 14, color: colors.text.secondary },
  specValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text.primary, textAlign: 'right' },
  desc: { marginTop: 12, fontSize: 15, color: colors.text.primary, lineHeight: 22 },
  actions: { marginTop: 20, gap: 10 },
  btnPrimary: {
    backgroundColor: colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnPrimaryText: { color: colors.bg.partnerLogo, fontWeight: '600' },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.primary[700], fontWeight: '600' },
  iconAction: {
    padding: 12,
    borderWidth: 2,
    borderColor: `${colors.primary[500]}40`,
    borderRadius: 8,
    backgroundColor: colors.bg.partnerLogo,
  },
});
