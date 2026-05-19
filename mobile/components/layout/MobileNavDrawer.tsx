import { useRouter } from 'expo-router';
import { Modal, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';

import { useAuth } from '@/auth/AuthContext';
import { buildSignInHref, setAuthReturnPath } from '@/auth/returnPath';
import { AppButton } from '@/components/ui/AppButton';
import {
  DocumentsIcon,
  HeartIcon,
  LogoutIcon,
  ScaleIcon,
  UserIcon,
} from '@/components/icons';
import { useComparison } from '@/comparison/useComparison';
import { useI18n } from '@/i18n/I18nContext';
import colors from '@/theme/synced/colors';

import { MobileLanguageSwitcher } from './MobileLanguageSwitcher';

type MobileNavDrawerProps = {
  visible: boolean;
  closing: boolean;
  animMs: number;
  onClose: () => void;
};

export function MobileNavDrawer({ visible, closing, animMs, onClose }: MobileNavDrawerProps) {
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(width * 0.8, 448);
  const { t } = useI18n();
  const { user, signOut } = useAuth();
  const router = useRouter();
  const { count } = useComparison();
  const translateX = useSharedValue(-drawerWidth);
  const backdropOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible && !closing) {
      translateX.value = withTiming(0, { duration: animMs });
      backdropOpacity.value = withTiming(0.35, { duration: animMs });
    } else {
      translateX.value = withTiming(-drawerWidth, { duration: animMs });
      backdropOpacity.value = withTiming(0, { duration: animMs });
    }
  }, [visible, closing, animMs, drawerWidth, translateX, backdropOpacity]);

  const panelStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  function navigate(path: string) {
    onClose();
    setTimeout(() => router.push(path as never), animMs);
  }

  async function onGuestLogin() {
    await setAuthReturnPath('/');
    onClose();
    setTimeout(() => router.push(buildSignInHref('/') as never), animMs);
  }

  if (!visible) return null;

  return (
    <Modal transparent visible animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={t('common.close')} />
        </Animated.View>
        <Animated.View style={[styles.panel, { width: drawerWidth }, panelStyle]}>
          <View style={styles.content}>
            <AppButton variant="createListing" onPress={() => navigate('/create')} style={styles.full}>
              {t('header.createListing')}
            </AppButton>

            {user ? (
              <>
                <NavItem
                  icon={<DocumentsIcon />}
                  label={t('header.myListings')}
                  onPress={() => navigate('/my-listings')}
                />
                <NavItem
                  icon={<HeartIcon />}
                  label={t('header.favorites')}
                  onPress={() => navigate('/favorites')}
                />
                <NavItem
                  icon={<ScaleIcon />}
                  label={t('header.compare')}
                  badge={count}
                  onPress={() => navigate('/compare')}
                />
                <NavItem
                  icon={<UserIcon />}
                  label={t('header.profile')}
                  onPress={() => navigate('/profile')}
                />
                <NavItem
                  icon={<LogoutIcon />}
                  label={t('header.logout')}
                  onPress={async () => {
                    onClose();
                    await signOut();
                  }}
                />
              </>
            ) : (
              <>
                <AppButton variant="drawerLogin" onPress={onGuestLogin} style={styles.full}>
                  {t('header.loginAndRegister')}
                </AppButton>
                <NavItem
                  icon={<ScaleIcon />}
                  label={t('header.compare')}
                  badge={count}
                  onPress={() => navigate('/compare')}
                />
              </>
            )}

            <MobileLanguageSwitcher />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function NavItem({
  icon,
  label,
  badge,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  badge?: number;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.navItem} onPress={onPress}>
      {icon}
      <Text style={styles.navLabel}>{label}</Text>
      {badge != null && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.dark[900],
  },
  panel: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.bg.base,
    borderRightWidth: 1,
    borderRightColor: colors.primary[700],
    paddingTop: 56,
  },
  content: { padding: 16, gap: 12 },
  full: { width: '100%' },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  navLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: colors.primary[900] },
  badge: {
    minWidth: 22,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    backgroundColor: colors.primary[500],
    borderWidth: 1,
    borderColor: colors.primary[300],
  },
  badgeText: { color: colors.text.onPrimary, fontSize: 11, fontWeight: '700', textAlign: 'center' },
});
