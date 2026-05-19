import { StyleSheet, View } from 'react-native';

import { useNavDrawer } from '@/hooks/useNavDrawer';
import colors from '@/theme/synced/colors';

import { MobileAppHeader } from './MobileAppHeader';
import { MobileNavDrawer } from './MobileNavDrawer';

type MobileAppShellProps = {
  title?: string;
  rightSlot?: React.ReactNode;
  children: React.ReactNode;
};

export function MobileAppShell({ title, rightSlot, children }: MobileAppShellProps) {
  const { open, mounted, closing, animMs, toggleDrawer, closeDrawer } = useNavDrawer();

  return (
    <View style={styles.root}>
      <MobileAppHeader
        title={title}
        drawerOpen={open}
        onToggleDrawer={toggleDrawer}
        rightSlot={rightSlot}
      />
      <View style={styles.body}>{children}</View>
      <MobileNavDrawer
        visible={mounted}
        closing={closing}
        animMs={animMs}
        onClose={closeDrawer}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg.base },
  body: { flex: 1 },
});
