import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { persistSessionFromAuthResponse, mobileAuthApi } from '@/api/auth';
import { useAuth } from '@/auth/AuthContext';
import { clearAuthReturnPath, getAuthReturnPath, sanitizeReturnPath } from '@/auth/returnPath';
import { Text } from '@/components/Themed';
import { showToast } from '@/components/providers/ToastProvider';
import { useI18n } from '@/i18n/I18nContext';
import colors from '@/theme/synced/colors';

export default function SignInScreen() {
  const { t } = useI18n();
  const { refreshUser } = useAuth();
  const router = useRouter();
  const { returnTo: returnToParam } = useLocalSearchParams<{ returnTo?: string }>();
  const [login, setLogin] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    try {
      const { data } = await mobileAuthApi.login({ login: login.trim(), password });
      await persistSessionFromAuthResponse(data);
      await refreshUser();
      const stored = await getAuthReturnPath();
      const target =
        sanitizeReturnPath(typeof returnToParam === 'string' ? returnToParam : stored) ?? '/(tabs)';
      await clearAuthReturnPath();
      router.replace(target as '/(tabs)');
    } catch {
      showToast('error', t('mobile.auth.signInFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.wrap}
    >
      <View style={styles.box}>
        <Text style={styles.label}>{t('mobile.auth.login')}</Text>
        <TextInput
          value={login}
          onChangeText={setLogin}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('mobile.auth.emailOrPhone')}
          placeholderTextColor={colors.text.secondary}
          style={styles.input}
        />
        <Text style={styles.label}>{t('mobile.auth.password')}</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholderTextColor={colors.text.secondary}
          style={styles.input}
        />
        <Pressable
          style={[styles.btn, busy && styles.btnDisabled]}
          onPress={onSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.text.onPrimary} />
          ) : (
            <Text style={styles.btnText}>{t('mobile.auth.signIn')}</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() =>
            router.push(
              returnToParam
                ? (`/auth/sign-up?returnTo=${encodeURIComponent(String(returnToParam))}` as '/auth/sign-up')
                : '/auth/sign-up',
            )
          }
        >
          <Text style={styles.link}>{t('mobile.auth.createAccount')}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.bg.base, justifyContent: 'center', padding: 20 },
  box: { gap: 8 },
  label: { fontSize: 14, color: colors.text.secondary },
  input: {
    borderWidth: 2,
    borderColor: colors.divider,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: colors.bg.partnerLogo,
    color: colors.text.primary,
  },
  btn: {
    marginTop: 16,
    backgroundColor: colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: colors.text.onPrimary, fontWeight: '600' },
  link: { marginTop: 16, textAlign: 'center', color: colors.primary[600] },
});
