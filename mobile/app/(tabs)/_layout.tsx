import { Stack } from 'expo-router';

import { MobileCatalogSearchProvider } from '@/catalog/MobileCatalogSearchContext';

export default function MainLayout() {
  return (
    <MobileCatalogSearchProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="create" />
        <Stack.Screen name="compare" />
        <Stack.Screen name="profile" />
        <Stack.Screen name="filter" options={{ presentation: 'card' }} />
      </Stack>
    </MobileCatalogSearchProvider>
  );
}
