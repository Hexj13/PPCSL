import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { persistSessionFromAuthResponse, mobileAuthApi } from '@/api/auth';
import { useAuth } from '@/auth/AuthContext';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import colors from '@/theme/synced/colors';

export default function SignUpScreen() {
  const { t } = useI18n();
  const { refreshUser } = useAuth();
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit() {
    setBusy(true);
    try {
      await mobileAuthApi.register({
        phone: phone.trim(),
        email: email.trim() || undefined,
        password,
        type: 'Individual',
        firstName: firstName.trim() || undefined,
        termsAccepted: true,
      });
      const { data } = await mobileAuthApi.login({
        login: email.trim() || phone.trim(),
        password,
      });
      await persistSessionFromAuthResponse(data);
      await refreshUser();
      router.replace('/(tabs)');
    } catch {
      Alert.alert(t('common.error'), t('mobile.auth.signUpFailed'));
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
        <Text style={styles.label}>{t('mobile.auth.phone')}</Text>
        <TextInput value={phone} onChangeText={setPhone} keyboardType="phone-pad" style={styles.input} />
        <Text style={styles.label}>{t('mobile.auth.emailOptional')}</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />
        <Text style={styles.label}>{t('mobile.auth.firstNameOptional')}</Text>
        <TextInput value={firstName} onChangeText={setFirstName} style={styles.input} />
        <Text style={styles.label}>{t('mobile.auth.password')}</Text>
        <TextInput value={password} onChangeText={setPassword} secureTextEntry style={styles.input} />
        <Pressable
          style={[styles.btn, busy && styles.btnDisabled]}
          onPress={onSubmit}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color={colors.bg.partnerLogo} />
          ) : (
            <Text style={styles.btnText}>{t('mobile.auth.signUp')}</Text>
          )}
        </Pressable>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.link}>{t('mobile.auth.haveAccount')}</Text>
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
    borderWidth: 1,
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
  btnText: { color: colors.bg.partnerLogo, fontWeight: '600' },
  link: { marginTop: 16, textAlign: 'center', color: colors.primary[600] },
});
