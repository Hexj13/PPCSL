import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useI18n } from '@/i18n/I18nContext';
import colors from '@/theme/synced/colors';

export function MobileLanguageSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{t('mobile.nav.language')}</Text>
      <View style={styles.pills}>
        {(['ro', 'ru'] as const).map((code) => {
          const active = locale === code;
          return (
            <Pressable
              key={code}
              style={[styles.pill, active && styles.pillActive]}
              onPress={() => setLocale(code)}
            >
              <Text style={[styles.pillText, active && styles.pillTextActive]}>
                {code === 'ro' ? t('common.languageRo') : t('common.languageRu')}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, marginTop: 8 },
  label: { fontSize: 13, fontWeight: '600', color: colors.text.secondary },
  pills: { flexDirection: 'row', gap: 8 },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.divider,
    alignItems: 'center',
  },
  pillActive: {
    borderColor: colors.primary[700],
    backgroundColor: `${colors.primary[500]}1A`,
  },
  pillText: { fontSize: 14, color: colors.text.secondary, fontWeight: '500' },
  pillTextActive: { color: colors.primary[900], fontWeight: '600' },
});
