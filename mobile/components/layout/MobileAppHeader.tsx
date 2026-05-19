import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon, MenuIcon } from '@/components/icons';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import colors from '@/theme/synced/colors';

type MobileAppHeaderProps = {
  title?: string;
  drawerOpen: boolean;
  onToggleDrawer: () => void;
  rightSlot?: React.ReactNode;
};

export function MobileAppHeader({
  title,
  drawerOpen,
  onToggleDrawer,
  rightSlot,
}: MobileAppHeaderProps) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const displayTitle = title ?? t('header.brandName');

  return (
    <View style={[styles.bar, { paddingTop: insets.top + 8 }]}>
      <Pressable
        onPress={onToggleDrawer}
        style={styles.iconBtn}
        accessibilityRole="button"
        accessibilityLabel={t('header.toggleMenu')}
      >
        {drawerOpen ? <CloseIcon size={24} /> : <MenuIcon size={24} />}
      </Pressable>
      <Text style={styles.title} numberOfLines={1}>
        {displayTitle}
      </Text>
      <View style={styles.right}>{rightSlot}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: colors.bg.base,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  iconBtn: { padding: 8, marginRight: 4 },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: colors.primary[900],
  },
  right: { minWidth: 40, alignItems: 'flex-end' },
});
