import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { HeartIcon, ScaleIcon } from '@/components/icons';
import { Text } from '@/components/Themed';
import type { Listing } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

type ListingCardProps = {
  listing: Listing;
  onPress: () => void;
  favorite?: boolean;
  inComparison?: boolean;
  onToggleFavorite?: () => void;
  onToggleCompare?: () => void;
};

export function ListingCard({
  listing,
  onPress,
  favorite,
  inComparison,
  onToggleFavorite,
  onToggleCompare,
}: ListingCardProps) {
  const uri = listing.images?.[0];
  const currency = listing.currency ?? 'MDL';

  return (
    <Pressable style={styles.card} onPress={onPress}>
      {uri ? (
        <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
      ) : (
        <View style={[styles.thumb, styles.thumbPh]} />
      )}
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.price}>
          {listing.price != null ? `${listing.price} ${currency}` : '—'}
        </Text>
        <Text style={styles.city} numberOfLines={1}>
          {listing.city}
        </Text>
        <View style={styles.actions}>
          {onToggleFavorite ? (
            <Pressable onPress={onToggleFavorite} hitSlop={8} style={styles.iconBtn}>
              <HeartIcon size={20} color={favorite ? colors.semantic.error : colors.primary[700]} />
            </Pressable>
          ) : null}
          {onToggleCompare ? (
            <Pressable onPress={onToggleCompare} hitSlop={8} style={styles.iconBtn}>
              <ScaleIcon size={20} color={inComparison ? colors.primary[500] : colors.primary[700]} />
            </Pressable>
          ) : null}
        </View>
      </View>
      {listing.is_promoted ? <View style={styles.promoted} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    marginHorizontal: 12,
    marginVertical: 6,
    backgroundColor: colors.bg.partnerLogo,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: `${colors.primary[500]}40`,
  },
  thumb: { width: 120, height: 100 },
  thumbPh: { backgroundColor: colors.bg.darker },
  body: { flex: 1, padding: 10, justifyContent: 'center' },
  title: { fontSize: 15, fontWeight: '600', color: colors.text.primary, paddingRight: 8 },
  price: { marginTop: 4, fontSize: 16, color: colors.primary[700], fontWeight: '700' },
  city: { marginTop: 2, fontSize: 13, color: colors.text.secondary },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  iconBtn: { padding: 4 },
  promoted: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
