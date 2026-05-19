import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { mobileSavedFiltersApi, type SavedFilter } from '@/api/saved-filters';
import { getApiErrorMessage } from '@/api/getApiErrorMessage';
import { useMobileCatalogSearch } from '@/catalog/MobileCatalogSearchContext';
import { showToast } from '@/components/providers/ToastProvider';
import { Text } from '@/components/Themed';
import { useI18n } from '@/i18n/I18nContext';
import type { SearchParams } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

type SavedFiltersListProps = {
  onApplied?: () => void;
};

export function SavedFiltersList({ onApplied }: SavedFiltersListProps) {
  const { t } = useI18n();
  const { applyParams } = useMobileCatalogSearch();
  const [items, setItems] = useState<SavedFilter[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await mobileSavedFiltersApi.getAll();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function onApply(filter: SavedFilter) {
    applyParams(filter.filters as SearchParams);
    showToast('success', t('saveFilter.filterSaved'));
    onApplied?.();
  }

  async function onRemove(id: string) {
    try {
      await mobileSavedFiltersApi.remove(id);
      await load();
      showToast('success', t('common.success'));
    } catch (err) {
      showToast('error', getApiErrorMessage(err, t('common.error')));
    }
  }

  if (loading) {
    return <ActivityIndicator color={colors.primary[500]} style={{ marginTop: 24 }} />;
  }

  if (items.length === 0) {
    return <Text style={styles.empty}>{t('favorites.empty')}</Text>;
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Pressable style={styles.rowMain} onPress={() => onApply(item)}>
            <Text style={styles.name}>{item.name}</Text>
          </Pressable>
          <Pressable onPress={() => onRemove(item.id)}>
            <Text style={styles.remove}>{t('common.delete')}</Text>
          </Pressable>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 8 },
  empty: { textAlign: 'center', marginTop: 32, color: colors.text.secondary },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: `${colors.primary[500]}40`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  rowMain: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: colors.text.primary },
  remove: { color: colors.semantic.error, fontWeight: '600' },
});
