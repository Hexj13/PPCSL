import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useI18n } from '@/i18n/I18nContext';
import colors from '@/theme/synced/colors';

export type MobileBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
};

export function MobileBottomSheet({ visible, onClose, title, children, footer }: MobileBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.close')}
          style={[StyleSheet.absoluteFillObject, styles.backdrop]}
          onPress={onClose}
        />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    backgroundColor: colors.dark[900],
    opacity: 0.5,
  },
  sheet: {
    width: '100%',
    maxHeight: '88%',
    backgroundColor: colors.bg.partnerLogo,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingTop: 10,
    ...Platform.select({
      web: {
        boxShadow: '0 -4px 24px rgba(0, 0, 0, 0.14)',
      },
      default: {
        shadowColor: colors.dark[900],
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.12,
        shadowRadius: 8,
        elevation: 12,
      },
    }),
  },
  handle: {
    alignSelf: 'center',
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.divider,
    marginBottom: 10,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
  },
  footer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
});
