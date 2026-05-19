import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useAuth } from '@/auth/AuthContext';
import { AuthRequiredScreen } from '@/components/auth/AuthRequiredScreen';
import { MobileAppShell } from '@/components/layout/MobileAppShell';
import { AppButton } from '@/components/ui/AppButton';
import { showToast } from '@/components/providers/ToastProvider';
import { getApiErrorMessage } from '@/api/getApiErrorMessage';
import { registerPushWithBackend } from '@/push/registerPushToken';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import colors from '@/theme/synced/colors';

export default function ProfileScreen() {
  const { t } = useI18n();
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <MobileAppShell title={t('header.profile')}>
        <View style={styles.centered}>
          <Text>{t('common.loading')}</Text>
        </View>
      </MobileAppShell>
    );
  }

  if (!user) {
    return (
      <MobileAppShell title={t('header.profile')}>
        <AuthRequiredScreen titleKey="mobile.profile.guest" />
      </MobileAppShell>
    );
  }

  const displayName =
    user.type === 'Business'
      ? user.companyName ?? user.email ?? user.phone
      : [user.firstName, user.lastName].filter(Boolean).join(' ') || user.email || user.phone;

  return (
    <MobileAppShell title={t('header.profile')}>
      <View style={styles.container}>
        <Text style={styles.name}>{displayName}</Text>
        {user.type === 'Business' && user.companyWebsiteUrl ? (
          <Text style={styles.meta}>{user.companyWebsiteUrl}</Text>
        ) : null}
        {user.phone ? <Text style={styles.meta}>{user.phone}</Text> : null}
        {user.email ? <Text style={styles.meta}>{user.email}</Text> : null}

        <AppButton variant="secondary" onPress={() => router.push('/my-listings')} style={styles.btn}>
          {t('header.myListings')}
        </AppButton>

        <AppButton
          variant="secondary"
          onPress={async () => {
            try {
              await registerPushWithBackend();
              showToast('success', t('common.success'));
            } catch (err) {
              showToast('error', getApiErrorMessage(err, t('common.error')));
            }
          }}
          style={styles.btn}
        >
          {t('mobile.profile.push')}
        </AppButton>

        <Pressable onPress={signOut} style={styles.logout}>
          <Text style={styles.logoutText}>{t('header.logout')}</Text>
        </Pressable>
      </View>
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  container: { padding: 16, gap: 10 },
  name: { fontSize: 20, fontWeight: '700', color: colors.primary[900] },
  meta: { fontSize: 14, color: colors.text.secondary },
  btn: { marginTop: 8 },
  logout: { marginTop: 24, paddingVertical: 12 },
  logoutText: { color: colors.semantic.error, fontWeight: '600', textAlign: 'center' },
});
