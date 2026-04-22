import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { mobileListingsApi } from '@/api/listings';
import { useAuth } from '@/auth/AuthContext';
import { registerPushWithBackend } from '@/push/registerPushToken';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import type { Listing } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

export default function ProfileScreen() {
  const { t, locale, setLocale } = useI18n();
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<Listing[]>([]);
  const [listLoading, setListLoading] = useState(false);

  const loadMine = useCallback(async () => {
    if (!user) return;
    setListLoading(true);
    try {
      const { data } = await mobileListingsApi.getMy(1, 50);
      setItems(data.data);
    } finally {
      setListLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.primary[500]} />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={styles.hint}>{t('mobile.profile.guest')}</Text>
        <Pressable style={styles.btnPrimary} onPress={() => router.push('/auth/sign-in')}>
          <Text style={styles.btnPrimaryText}>{t('mobile.auth.signIn')}</Text>
        </Pressable>
        <Pressable style={styles.btnSecondary} onPress={() => router.push('/auth/sign-up')}>
          <Text style={styles.btnSecondaryText}>{t('mobile.auth.signUp')}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.email}>{user.email ?? user.phone}</Text>
        <Pressable style={styles.btnGhost} onPress={() => setLocale(locale === 'ro' ? 'ru' : 'ro')}>
          <Text style={styles.btnGhostText}>
            {t('mobile.profile.language')}: {locale.toUpperCase()}
          </Text>
        </Pressable>
        <Pressable
          style={styles.btnGhost}
          onPress={async () => {
            try {
              await registerPushWithBackend();
            } catch {
              /* ignored */
            }
          }}
        >
          <Text style={styles.btnGhostText}>{t('mobile.profile.push')}</Text>
        </Pressable>
        <Pressable style={styles.btnDanger} onPress={signOut}>
          <Text style={styles.btnDangerText}>{t('mobile.profile.signOut')}</Text>
        </Pressable>
      </View>
      <Text style={styles.section}>{t('mobile.profile.myListings')}</Text>
      {listLoading ? (
        <ActivityIndicator color={colors.primary[500]} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const uri = item.images?.[0];
            return (
              <Pressable
                style={styles.row}
                onPress={() => router.push(`/listing/${item.id}`)}
              >
                {uri ? (
                  <Image source={{ uri }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPh]} />
                )}
                <View style={styles.rowBody}>
                  <Text numberOfLines={2} style={styles.rowTitle}>
                    {item.title}
                  </Text>
                  <Text style={styles.rowMeta}>{item.status}</Text>
                </View>
                <Pressable
                  onPress={() =>
                    router.push({ pathname: '/(tabs)/create', params: { editId: item.id } })
                  }
                >
                  <Text style={styles.edit}>{t('common.edit')}</Text>
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.base },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, gap: 12 },
  hint: { textAlign: 'center', color: colors.text.secondary },
  header: { padding: 16, gap: 8, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: colors.divider },
  email: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  section: { padding: 16, fontWeight: '700', fontSize: 16 },
  btnPrimary: {
    backgroundColor: colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnPrimaryText: { color: '#fff', fontWeight: '600' },
  btnSecondary: {
    borderWidth: 1,
    borderColor: colors.primary[500],
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  btnSecondaryText: { color: colors.primary[700], fontWeight: '600' },
  btnGhost: { paddingVertical: 8 },
  btnGhostText: { color: colors.primary[700], fontWeight: '600' },
  btnDanger: { marginTop: 8, paddingVertical: 8 },
  btnDangerText: { color: colors.semantic.danger, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  thumb: { width: 64, height: 48, borderRadius: 6 },
  thumbPh: { backgroundColor: colors.bg.darker },
  rowBody: { flex: 1 },
  rowTitle: { fontWeight: '600', color: colors.text.primary },
  rowMeta: { fontSize: 12, color: colors.text.secondary, marginTop: 4 },
  edit: { color: colors.primary[700], fontWeight: '600' },
});
