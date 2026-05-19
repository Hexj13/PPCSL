import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { getApiErrorMessage } from '@/api/getApiErrorMessage';
import { mobileListingsApi } from '@/api/listings';
import { useAuth } from '@/auth/AuthContext';
import { AuthRequiredScreen } from '@/components/auth/AuthRequiredScreen';
import { MobileAppShell } from '@/components/layout/MobileAppShell';
import { showToast } from '@/components/providers/ToastProvider';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import type { Listing } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

type StatusFilter = '' | 'Active' | 'Paused' | 'Closed' | 'Draft';

export default function MyListingsScreen() {
  const { t } = useI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<StatusFilter>('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data } = await mobileListingsApi.getMy(1, 50, status || undefined, undefined, search);
      setItems(data.data);
    } finally {
      setLoading(false);
    }
  }, [user, status, search]);

  useEffect(() => {
    load();
  }, [load]);

  async function onAction(id: string, action: 'publish' | 'pause' | 'close') {
    try {
      if (action === 'publish') await mobileListingsApi.publish(id);
      else if (action === 'pause') await mobileListingsApi.pause(id);
      else await mobileListingsApi.close(id);
      await load();
      showToast('success', t('common.success'));
    } catch (err) {
      showToast('error', getApiErrorMessage(err, t('common.error')));
    }
  }

  if (authLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  if (!user) {
    return (
      <MobileAppShell title={t('mobile.myListings.title')}>
        <AuthRequiredScreen />
      </MobileAppShell>
    );
  }

  const statuses: StatusFilter[] = ['', 'Active', 'Paused', 'Closed', 'Draft'];

  return (
    <MobileAppShell title={t('mobile.myListings.title')}>
      <View style={styles.filters}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          onSubmitEditing={load}
          placeholder={t('myListings.searchByBrandModelPlaceholder')}
          placeholderTextColor={colors.text.secondary}
          style={styles.search}
        />
        <View style={styles.chips}>
          {statuses.map((s) => (
            <Pressable
              key={s || 'all'}
              style={[styles.chip, status === s && styles.chipActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.chipText, status === s && styles.chipTextActive]}>
                {s === 'Active'
                  ? t('myListings.active')
                  : s === 'Paused'
                    ? t('myListings.paused')
                    : s === 'Closed'
                      ? t('myListings.closed')
                      : s === 'Draft'
                        ? t('listings.draftStatus')
                        : t('myListings.all')}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={colors.primary[500]} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.empty}>{t('myListings.noListingsYet')}</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Pressable onPress={() => router.push(`/listing/${item.id}`)}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.cardMeta}>{item.status}</Text>
              </Pressable>
              <View style={styles.actions}>
                <Pressable onPress={() => router.push(`/create?editId=${item.id}`)}>
                  <Text style={styles.action}>{t('common.edit')}</Text>
                </Pressable>
                {item.status === 'Paused' ? (
                  <Pressable onPress={() => onAction(item.id, 'publish')}>
                    <Text style={styles.action}>{t('listings.publishAction')}</Text>
                  </Pressable>
                ) : null}
                {item.status === 'Active' ? (
                  <Pressable onPress={() => onAction(item.id, 'pause')}>
                    <Text style={styles.action}>{t('listings.pauseAction')}</Text>
                  </Pressable>
                ) : null}
                {item.status !== 'Closed' ? (
                  <Pressable onPress={() => onAction(item.id, 'close')}>
                    <Text style={styles.actionDanger}>{t('listings.closeAction')}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filters: { padding: 12, gap: 8 },
  search: {
    borderWidth: 2,
    borderColor: colors.divider,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text.primary,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipActive: { borderColor: colors.primary[700], backgroundColor: `${colors.primary[500]}1A` },
  chipText: { fontSize: 13, color: colors.text.secondary },
  chipTextActive: { color: colors.primary[900], fontWeight: '600' },
  list: { padding: 12, gap: 12 },
  empty: { textAlign: 'center', color: colors.text.secondary, marginTop: 32 },
  card: {
    borderWidth: 2,
    borderColor: `${colors.primary[500]}40`,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  cardMeta: { fontSize: 13, color: colors.text.secondary },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  action: { color: colors.primary[700], fontWeight: '600' },
  actionDanger: { color: colors.semantic.error, fontWeight: '600' },
});
