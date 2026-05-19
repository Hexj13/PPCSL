import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { mobileSavedFiltersApi } from '@/api/saved-filters';
import { getApiErrorMessage } from '@/api/getApiErrorMessage';
import { CatalogFilterForm } from '@/components/catalog/CatalogFilterForm';
import { FilterSelectRow } from '@/components/catalog/filters/FilterSelectRow';
import { MobileBottomSheet } from '@/components/MobileBottomSheet';
import { MobileAppShell } from '@/components/layout/MobileAppShell';
import { AppButton } from '@/components/ui/AppButton';
import { showToast } from '@/components/providers/ToastProvider';
import {
  defaultCatalogSearchParams,
  useMobileCatalogSearch,
} from '@/catalog/MobileCatalogSearchContext';
import { useAuth } from '@/auth/AuthContext';
import { useI18n } from '@/i18n/I18nContext';
import type { SearchParams } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

type VehicleCriteriaTab = 'basic' | 'advanced' | 'equipment' | 'popular';
type TireCriteriaTab = 'basic' | 'popular';

const CATEGORY_OPTIONS = [
  { key: 'car', kind: 'vehicle' as const, vehicleType: 'car' as const },
  { key: 'truck', kind: 'vehicle' as const, vehicleType: 'truck' as const },
  { key: 'moto', kind: 'vehicle' as const, vehicleType: 'moto' as const },
  { key: 'tires', kind: 'tire' as const },
];

export default function FilterScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { user } = useAuth();
  const { baselineDraftParams, setCommittedFilters } = useMobileCatalogSearch();
  const [draft, setDraft] = useState<SearchParams>(() => baselineDraftParams());
  const [categorySheet, setCategorySheet] = useState(false);
  const [criteriaSheet, setCriteriaSheet] = useState(false);
  const [vehicleTab, setVehicleTab] = useState<VehicleCriteriaTab>('basic');
  const [tireTab, setTireTab] = useState<TireCriteriaTab>('basic');

  useFocusEffect(
    useCallback(() => {
      setDraft(baselineDraftParams());
    }, [baselineDraftParams]),
  );

  const isTire = draft.category === 'tire';

  const categoryLabel = isTire
    ? t('mobile.catalog.categoryTires')
    : t(`mobile.catalog.vehicleType_${draft.vehicleType ?? 'car'}`);

  const criteriaLabel = isTire
    ? tireTab === 'basic'
      ? t('searchFilters.basicCriteria')
      : t('searchFilters.popularFilters')
    : vehicleTab === 'basic'
      ? t('searchFilters.basicCriteria')
      : vehicleTab === 'advanced'
        ? t('searchFilters.additionalCriteria')
        : vehicleTab === 'equipment'
          ? t('searchFilters.equipment')
          : t('searchFilters.popularFilters');

  function applyToCatalog(next: SearchParams) {
    setCommittedFilters(next);
    router.navigate('/(tabs)');
  }

  function resetDraft() {
    const kind = draft.category === 'tire' ? 'tire' : 'vehicle';
    setDraft(defaultCatalogSearchParams(kind));
  }

  async function saveFilter() {
    if (!user) return;
    try {
      await mobileSavedFiltersApi.create(t('saveFilter.saveTitle'), draft as Record<string, unknown>);
      showToast('success', t('saveFilter.filterSaved'));
    } catch (err) {
      showToast('error', getApiErrorMessage(err, t('common.error')));
    }
  }

  const topSlot = (
    <View style={styles.selectRows}>
      <FilterSelectRow
        label={t('searchFilters.categoryLabel')}
        valueSummary={categoryLabel}
        placeholder={t('searchFilters.categoryLabel')}
        onPress={() => setCategorySheet(true)}
      />
      <FilterSelectRow
        label={t('searchFilters.basicCriteria')}
        valueSummary={criteriaLabel}
        placeholder={t('searchFilters.basicCriteria')}
        onPress={() => setCriteriaSheet(true)}
      />
    </View>
  );

  return (
    <MobileAppShell title={t('mobile.catalog.filtersTitle')}>
      <View style={styles.page}>
        <CatalogFilterForm
          active
          draft={draft}
          onChangeDraft={(patch) => setDraft((d) => ({ ...d, ...patch }))}
          onApply={applyToCatalog}
          onReset={resetDraft}
          t={t}
          topSlot={topSlot}
          applyButtonLabelKey="searchFilters.search"
          criteriaTab={isTire ? tireTab : vehicleTab}
          onSaveFilter={user ? saveFilter : undefined}
        />
      </View>

      <MobileBottomSheet
        visible={categorySheet}
        onClose={() => setCategorySheet(false)}
        title={t('searchFilters.categoryLabel')}
        footer={
          <AppButton variant="primary" onPress={() => setCategorySheet(false)} style={styles.full}>
            {t('common.ok')}
          </AppButton>
        }
      >
        {CATEGORY_OPTIONS.map((opt) => (
          <AppButton
            key={opt.key}
            variant="drawerNavItem"
            onPress={() => {
              if (opt.kind === 'tire') {
                setDraft(defaultCatalogSearchParams('tire'));
              } else {
                setDraft({ ...defaultCatalogSearchParams('vehicle'), vehicleType: opt.vehicleType });
              }
              setCategorySheet(false);
            }}
            style={styles.full}
          >
            {opt.kind === 'tire'
              ? t('mobile.catalog.categoryTires')
              : t(`mobile.catalog.vehicleType_${opt.vehicleType}`)}
          </AppButton>
        ))}
      </MobileBottomSheet>

      <MobileBottomSheet
        visible={criteriaSheet}
        onClose={() => setCriteriaSheet(false)}
        title={t('searchFilters.basicCriteria')}
        footer={
          <AppButton variant="primary" onPress={() => setCriteriaSheet(false)} style={styles.full}>
            {t('common.ok')}
          </AppButton>
        }
      >
        {isTire ? (
          <>
            <AppButton
              variant="drawerNavItem"
              onPress={() => {
                setTireTab('basic');
                setCriteriaSheet(false);
              }}
              style={styles.full}
            >
              {t('searchFilters.basicCriteria')}
            </AppButton>
            <AppButton
              variant="drawerNavItem"
              onPress={() => {
                setTireTab('popular');
                setCriteriaSheet(false);
              }}
              style={styles.full}
            >
              {t('searchFilters.popularFilters')}
            </AppButton>
          </>
        ) : (
          (['basic', 'advanced', 'equipment', 'popular'] as VehicleCriteriaTab[]).map((tab) => (
            <AppButton
              key={tab}
              variant="drawerNavItem"
              onPress={() => {
                setVehicleTab(tab);
                setCriteriaSheet(false);
              }}
              style={styles.full}
            >
              {tab === 'basic'
                ? t('searchFilters.basicCriteria')
                : tab === 'advanced'
                  ? t('searchFilters.additionalCriteria')
                  : tab === 'equipment'
                    ? t('searchFilters.equipment')
                    : t('searchFilters.popularFilters')}
            </AppButton>
          ))
        )}
      </MobileBottomSheet>
    </MobileAppShell>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg.base },
  selectRows: { marginBottom: 4 },
  full: { width: '100%', marginBottom: 8 },
});
