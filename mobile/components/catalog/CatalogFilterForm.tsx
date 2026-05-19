import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { mobileBrandsApi } from '@/api/brands';
import { mobileCitiesApi } from '@/api/cities';
import { mobileTiresApi, type TireBrand, type TireModel } from '@/api/tires';
import { hasActiveCatalogFilters } from '@/catalog/hasActiveCatalogFilters';
import { MobileBottomSheet } from '@/components/MobileBottomSheet';
import { AppButton } from '@/components/ui/AppButton';
import { SearchIcon } from '@/components/icons';
import { Text } from '@/components/Themed';
import type { Brand, City, SearchParams, VehicleModel } from '@/synced/api-types';
import colors from '@/theme/synced/colors';

const SORT_OPTIONS: {
  key: string;
  sortBy: NonNullable<SearchParams['sortBy']>;
  sortOrder: NonNullable<SearchParams['sortOrder']>;
  labelKey: string;
}[] = [
  { key: 'cd', sortBy: 'created_at', sortOrder: 'DESC', labelKey: 'common.sorting.newestFirst' },
  { key: 'ca', sortBy: 'created_at', sortOrder: 'ASC', labelKey: 'common.sorting.oldestFirst' },
  { key: 'vd', sortBy: 'views', sortOrder: 'DESC', labelKey: 'common.sorting.popular' },
  { key: 'pa', sortBy: 'price', sortOrder: 'ASC', labelKey: 'common.sorting.priceAscending' },
  { key: 'pd', sortBy: 'price', sortOrder: 'DESC', labelKey: 'common.sorting.priceDescending' },
  { key: 'yd', sortBy: 'year', sortOrder: 'DESC', labelKey: 'common.sorting.yearDescending' },
  { key: 'ya', sortBy: 'year', sortOrder: 'ASC', labelKey: 'common.sorting.yearAscending' },
];

const VEHICLE_TYPES = ['car', 'truck', 'moto'] as const;

export type CatalogFilterFormProps = {
  active: boolean;
  draft: SearchParams;
  onChangeDraft: (patch: Partial<SearchParams>) => void;
  onApply: (next: SearchParams) => void;
  onReset: () => void;
  t: (key: string) => string;
  topSlot?: ReactNode;
  applyButtonLabelKey?: string;
  criteriaTab?: string;
  onSaveFilter?: () => void;
};

function tireBrandIdFromDraft(d: SearchParams): string | undefined {
  const raw = d.tire_brand_ids;
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw[0];
  const first = String(raw).split(',')[0]?.trim();
  return first || undefined;
}

function tireModelIdFromDraft(d: SearchParams): string | undefined {
  const raw = d.tire_model_ids;
  if (!raw) return undefined;
  if (Array.isArray(raw)) return raw[0];
  const first = String(raw).split(',')[0]?.trim();
  return first || undefined;
}

export function CatalogFilterForm({
  active,
  draft,
  onChangeDraft,
  onApply,
  onReset,
  t,
  topSlot,
  applyButtonLabelKey = 'searchFilters.search',
  onSaveFilter,
}: CatalogFilterFormProps) {
  const isTire = draft.category === 'tire';

  const [vehBrands, setVehBrands] = useState<Brand[]>([]);
  const [vehModels, setVehModels] = useState<VehicleModel[]>([]);
  const [tireBrands, setTireBrands] = useState<TireBrand[]>([]);
  const [tireModels, setTireModels] = useState<TireModel[]>([]);
  const [cities, setCities] = useState<City[]>([]);

  const [vehBrandSheet, setVehBrandSheet] = useState(false);
  const [vehModelSheet, setVehModelSheet] = useState(false);
  const [tireBrandSheet, setTireBrandSheet] = useState(false);
  const [tireModelSheet, setTireModelSheet] = useState(false);
  const [citySheet, setCitySheet] = useState(false);
  const [sortSheet, setSortSheet] = useState(false);
  const [vehBrandQuery, setVehBrandQuery] = useState('');
  const [tireBrandQuery, setTireBrandQuery] = useState('');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const vehicleType = draft.vehicleType ?? 'car';
  const tireVehicleType = draft.tireVehicleType ?? 'car';
  const tireBrandId = tireBrandIdFromDraft(draft);
  const tireModelId = tireModelIdFromDraft(draft);

  useEffect(() => {
    if (!active) return;
    setPriceMin(draft.price_gte != null ? String(draft.price_gte) : '');
    setPriceMax(draft.price_lte != null ? String(draft.price_lte) : '');
  }, [active, draft.price_gte, draft.price_lte]);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    (async () => {
      const { data } = await mobileCitiesApi.getAll();
      if (!cancelled) setCities(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active || isTire) return;
    let cancelled = false;
    (async () => {
      const { data } = await mobileBrandsApi.getAll(vehicleType);
      if (!cancelled) setVehBrands(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, isTire, vehicleType]);

  useEffect(() => {
    const brandId = draft.brand_id;
    if (!active || isTire || !brandId) {
      setVehModels([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await mobileBrandsApi.getModels(brandId, vehicleType);
      if (!cancelled) setVehModels(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, isTire, draft.brand_id, vehicleType]);

  useEffect(() => {
    if (!active || !isTire) return;
    let cancelled = false;
    (async () => {
      const { data } = await mobileTiresApi.getBrands();
      if (!cancelled) setTireBrands(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, isTire]);

  useEffect(() => {
    if (!active || !isTire || !tireBrandId) {
      setTireModels([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await mobileTiresApi.getModelsByBrand(tireBrandId);
      if (!cancelled) setTireModels(data ?? []);
    })();
    return () => {
      cancelled = true;
    };
  }, [active, isTire, tireBrandId]);

  const filteredVehBrands = useMemo(() => {
    const q = vehBrandQuery.trim().toLowerCase();
    if (!q) return vehBrands;
    return vehBrands.filter((b) => b.name.toLowerCase().includes(q));
  }, [vehBrands, vehBrandQuery]);

  const filteredTireBrands = useMemo(() => {
    const q = tireBrandQuery.trim().toLowerCase();
    if (!q) return tireBrands;
    return tireBrands.filter((b) => b.name.toLowerCase().includes(q));
  }, [tireBrands, tireBrandQuery]);

  const selectedVehBrand = vehBrands.find((b) => b.id === draft.brand_id);
  const selectedVehModel = vehModels.find((m) => m.id === draft.model_id);
  const selectedTireBrand = tireBrands.find((b) => b.id === tireBrandId);
  const selectedTireModel = tireModels.find((m) => m.id === tireModelId);

  const sortLabel = useMemo(() => {
    const m = SORT_OPTIONS.find((o) => o.sortBy === draft.sortBy && o.sortOrder === draft.sortOrder);
    return m ? t(m.labelKey) : t('common.sorting.newestFirst');
  }, [draft.sortBy, draft.sortOrder, t]);

  const applyPressed = useCallback(() => {
    const min = priceMin.trim() ? Math.round(Number(priceMin)) : undefined;
    const max = priceMax.trim() ? Math.round(Number(priceMax)) : undefined;
    const next: SearchParams = {
      ...draft,
      price_gte: min != null && !Number.isNaN(min) ? min : undefined,
      price_lte: max != null && !Number.isNaN(max) ? max : undefined,
    };
    onApply(next);
  }, [priceMin, priceMax, draft, onApply]);

  return (
    <>
      <View style={styles.screenRoot}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {topSlot ? <View style={styles.topSlot}>{topSlot}</View> : null}
          {isTire ? (
            <>
              <Text style={[styles.section, !topSlot && styles.sectionTightTop]}>
                {t('searchFilters.tireVehicleTypeFilter')}
              </Text>
              <View style={styles.rowWrap}>
                {VEHICLE_TYPES.map((vt) => (
                  <Pressable
                    key={vt}
                    style={[styles.chip, tireVehicleType === vt && styles.chipActive]}
                    onPress={() => {
                      onChangeDraft({
                        tireVehicleType: vt,
                        tire_brand_ids: undefined,
                        tire_model_ids: undefined,
                      });
                    }}
                  >
                    <Text style={[styles.chipText, tireVehicleType === vt && styles.chipTextActive]}>
                      {t(`searchFilters.tireVehicleType.${vt}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.section}>{t('searchFilters.tireBrand')}</Text>
              <Pressable style={styles.select} onPress={() => setTireBrandSheet(true)}>
                <Text style={styles.selectText}>
                  {selectedTireBrand?.name ?? t('searchFilters.selectTireBrands')}
                </Text>
              </Pressable>

              <Text style={styles.section}>{t('searchFilters.tireModel')}</Text>
              <Pressable
                style={styles.select}
                onPress={() => tireBrandId && setTireModelSheet(true)}
                disabled={!tireBrandId}
              >
                <Text style={[styles.selectText, !tireBrandId && styles.selectMuted]}>
                  {selectedTireModel?.name ?? t('searchFilters.selectTireModels')}
                </Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.section, !topSlot && styles.sectionTightTop]}>
                {t('mobile.catalog.vehicleType')}
              </Text>
              <View style={styles.rowWrap}>
                {VEHICLE_TYPES.map((vt) => (
                  <Pressable
                    key={vt}
                    style={[styles.chip, vehicleType === vt && styles.chipActive]}
                    onPress={() => {
                      onChangeDraft({
                        vehicleType: vt,
                        brand_id: undefined,
                        model_id: undefined,
                      });
                    }}
                  >
                    <Text style={[styles.chipText, vehicleType === vt && styles.chipTextActive]}>
                      {t(`mobile.catalog.vehicleType_${vt}`)}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.section}>{t('listings.brandLabel')}</Text>
              <Pressable style={styles.select} onPress={() => setVehBrandSheet(true)}>
                <Text style={styles.selectText}>{selectedVehBrand?.name ?? t('mobile.create.selectBrand')}</Text>
              </Pressable>

              <Text style={styles.section}>{t('listings.modelLabel')}</Text>
              <Pressable
                style={styles.select}
                onPress={() => draft.brand_id && setVehModelSheet(true)}
                disabled={!draft.brand_id}
              >
                <Text style={[styles.selectText, !draft.brand_id && styles.selectMuted]}>
                  {selectedVehModel?.name ?? t('mobile.create.selectModel')}
                </Text>
              </Pressable>
            </>
          )}

          <Text style={styles.section}>{t('listings.cityLabel')}</Text>
          <Pressable style={styles.select} onPress={() => setCitySheet(true)}>
            <Text style={styles.selectText}>{draft.city || t('mobile.create.selectCity')}</Text>
          </Pressable>

          <Text style={styles.section}>{t('mobile.catalog.priceRange')}</Text>
          <View style={styles.priceRow}>
            <TextInput
              value={priceMin}
              onChangeText={setPriceMin}
              keyboardType="number-pad"
              placeholder={t('mobile.catalog.priceFrom')}
              placeholderTextColor={colors.text.secondary}
              style={styles.priceInput}
            />
            <TextInput
              value={priceMax}
              onChangeText={setPriceMax}
              keyboardType="number-pad"
              placeholder={t('mobile.catalog.priceTo')}
              placeholderTextColor={colors.text.secondary}
              style={styles.priceInput}
            />
          </View>

          <Text style={styles.section}>{t('mobile.catalog.sort')}</Text>
          <Pressable style={styles.select} onPress={() => setSortSheet(true)}>
            <Text style={styles.selectText}>{sortLabel}</Text>
          </Pressable>
        </ScrollView>

        <View style={styles.footerBar}>
          {onSaveFilter ? (
            <AppButton variant="secondary" onPress={onSaveFilter} style={styles.footerBtn}>
              {t('saveFilter.saveTitle')}
            </AppButton>
          ) : null}
          <AppButton variant="secondary" onPress={onReset} style={styles.footerBtn}>
            {t('searchFilters.reset')}
          </AppButton>
          <AppButton
            variant="search"
            disabled={!hasActiveCatalogFilters(draft)}
            onPress={applyPressed}
            style={styles.footerBtn}
          >
            <SearchIcon size={18} />
            {t(applyButtonLabelKey)}
          </AppButton>
        </View>
      </View>

      <MobileBottomSheet visible={vehBrandSheet} onClose={() => setVehBrandSheet(false)} title={t('listings.brandLabel')}>
        <TextInput
          placeholder={t('common.search')}
          value={vehBrandQuery}
          onChangeText={setVehBrandQuery}
          style={styles.input}
          placeholderTextColor={colors.text.secondary}
        />
        <FlatList
          data={filteredVehBrands}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 360 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item.id === draft.brand_id && styles.sheetRowSelected]}
              onPress={() => {
                onChangeDraft({ brand_id: item.id, model_id: undefined });
                setVehBrandSheet(false);
                setVehBrandQuery('');
              }}
            >
              <Text style={styles.sheetRowText}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setVehBrandSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet visible={vehModelSheet} onClose={() => setVehModelSheet(false)} title={t('listings.modelLabel')}>
        <FlatList
          data={vehModels}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 400 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item.id === draft.model_id && styles.sheetRowSelected]}
              onPress={() => {
                onChangeDraft({ model_id: item.id });
                setVehModelSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setVehModelSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet
        visible={tireBrandSheet}
        onClose={() => setTireBrandSheet(false)}
        title={t('listings.brandLabel')}
      >
        <TextInput
          placeholder={t('common.search')}
          value={tireBrandQuery}
          onChangeText={setTireBrandQuery}
          style={styles.input}
          placeholderTextColor={colors.text.secondary}
        />
        <FlatList
          data={filteredTireBrands}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 360 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item.id === tireBrandId && styles.sheetRowSelected]}
              onPress={() => {
                onChangeDraft({ tire_brand_ids: item.id, tire_model_ids: undefined });
                setTireBrandSheet(false);
                setTireBrandQuery('');
              }}
            >
              <Text style={styles.sheetRowText}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setTireBrandSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet
        visible={tireModelSheet}
        onClose={() => setTireModelSheet(false)}
        title={t('listings.modelLabel')}
      >
        <FlatList
          data={tireModels}
          keyExtractor={(item) => item.id}
          style={{ maxHeight: 400 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item.id === tireModelId && styles.sheetRowSelected]}
              onPress={() => {
                onChangeDraft({ tire_model_ids: item.id });
                setTireModelSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setTireModelSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet visible={citySheet} onClose={() => setCitySheet(false)} title={t('listings.cityLabel')}>
        <FlatList
          data={cities}
          keyExtractor={(item) => item.name}
          style={{ maxHeight: 400 }}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            <Pressable
              style={styles.sheetRow}
              onPress={() => {
                onChangeDraft({ city: undefined });
                setCitySheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>—</Text>
            </Pressable>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.sheetRow, item.name === draft.city && styles.sheetRowSelected]}
              onPress={() => {
                onChangeDraft({ city: item.name });
                setCitySheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{item.name}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setCitySheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>

      <MobileBottomSheet visible={sortSheet} onClose={() => setSortSheet(false)} title={t('mobile.catalog.sort')}>
        <FlatList
          data={SORT_OPTIONS}
          keyExtractor={(item) => item.key}
          style={{ maxHeight: 420 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.sheetRow,
                draft.sortBy === item.sortBy && draft.sortOrder === item.sortOrder && styles.sheetRowSelected,
              ]}
              onPress={() => {
                onChangeDraft({ sortBy: item.sortBy, sortOrder: item.sortOrder });
                setSortSheet(false);
              }}
            >
              <Text style={styles.sheetRowText}>{t(item.labelKey)}</Text>
            </Pressable>
          )}
        />
        <Pressable style={styles.sheetCloseBtn} onPress={() => setSortSheet(false)}>
          <Text style={styles.btnSecondaryText}>{t('common.close')}</Text>
        </Pressable>
      </MobileBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    marginHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.bg.partnerLogo,
    overflow: 'hidden',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 12, paddingBottom: 8 },
  topSlot: { marginBottom: 4 },
  section: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  sectionTightTop: { marginTop: 0 },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.bg.base,
  },
  chipActive: {
    borderColor: colors.primary[500],
    backgroundColor: colors.primary[50],
  },
  chipText: { fontSize: 14, color: colors.text.primary },
  chipTextActive: { fontWeight: '600', color: colors.primary[700] },
  select: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    padding: 12,
    backgroundColor: colors.bg.base,
  },
  selectText: { fontSize: 16, color: colors.text.primary },
  selectMuted: { color: colors.text.secondary },
  priceRow: { flexDirection: 'row', gap: 8 },
  priceInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    color: colors.text.primary,
    backgroundColor: colors.bg.base,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.divider,
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    backgroundColor: colors.bg.partnerLogo,
    color: colors.text.primary,
  },
  footerBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    backgroundColor: colors.bg.base,
  },
  footerBtn: { flexGrow: 1, flexBasis: '45%', minWidth: 120 },
  sheetRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  sheetRowSelected: { backgroundColor: colors.primary[50] },
  sheetRowText: { fontSize: 16, color: colors.text.primary },
  sheetCloseBtn: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: colors.primary[500],
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnSecondaryText: { color: colors.primary[700], fontWeight: '600' },
});
