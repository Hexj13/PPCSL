import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import { useI18n } from '@/i18n/I18nContext';
import colors from '@/theme/synced/colors';

function TabIcon(props: { name: React.ComponentProps<typeof FontAwesome>['name']; color: string }) {
  return <FontAwesome size={22} style={{ marginBottom: -2 }} {...props} />;
}

export default function TabLayout() {
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary[600],
        tabBarInactiveTintColor: colors.text.secondary,
        headerStyle: { backgroundColor: colors.bg.base },
        headerTintColor: colors.text.primary,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: colors.divider },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('mobile.tabs.catalog'),
          tabBarIcon: ({ color }) => <TabIcon name="list" color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: t('mobile.tabs.favorites'),
          tabBarIcon: ({ color }) => <TabIcon name="heart" color={color} />,
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: t('mobile.tabs.create'),
          tabBarIcon: ({ color }) => <TabIcon name="plus-circle" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t('mobile.tabs.profile'),
          tabBarIcon: ({ color }) => <TabIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
