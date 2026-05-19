import { usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/ui/AppButton';
import { Text } from '@/components/Themed';
import { buildSignInHref, setAuthReturnPath } from '@/auth/returnPath';
import { useI18n } from '@/i18n/I18nContext';
import colors from '@/theme/synced/colors';

type AuthRequiredScreenProps = {
  titleKey?: string;
};

export function AuthRequiredScreen({ titleKey = 'mobile.auth.requiredTitle' }: AuthRequiredScreenProps) {
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();

  async function onLoginPress() {
    const returnTo = pathname || '/';
    await setAuthReturnPath(returnTo);
    router.push(buildSignInHref(returnTo) as '/auth/sign-in');
  }

  return (
    <View style={styles.centered}>
      <Text style={styles.hint}>{t(titleKey)}</Text>
      <AppButton variant="drawerLogin" onPress={onLoginPress} style={styles.btn}>
        {t('header.loginAndRegister')}
      </AppButton>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: colors.bg.base,
  },
  hint: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
  },
  btn: { width: '100%', maxWidth: 320 },
});
