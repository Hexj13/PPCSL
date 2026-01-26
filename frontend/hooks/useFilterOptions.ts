import { useCallback } from 'react';

import type { useTranslation } from '@/hooks/useTranslation';
import type { Brand, VehicleModel } from '@/lib/api';
import type { City } from '@/lib/api';
import { ConditionType, RegistrationType } from '@/lib/constants';
import { getColorOptions } from '@/lib/form-options';
import { getPopularBrands } from '@/lib/popular-brands';
import { compareNames, sortByName, sortOptionsByLabel, type LabeledOption } from '@/lib/utils';

import type { FilterState } from './useSearchFilters';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

const POPULAR_CITY_NAMES_EN = ['Skopje', 'Bitola', 'Kumanovo', 'Prilep', 'Tetovo'];

interface UseFilterOptionsParams {
  vehicleType: 'car' | 'moto' | 'truck';
  brands: Brand[];
  models: VehicleModel[];
  cities: City[];
  filters: FilterState;
  t: TranslationFunction;
}

export function useFilterOptions({
  vehicleType,
  brands,
  models,
  cities,
  filters,
  t,
}: UseFilterOptionsParams) {
  const COLOR_OPTIONS = getColorOptions(t);

  const getConditionOptions = useCallback(() => {
    return sortOptionsByLabel([
      { value: ConditionType.Undamaged, label: t('vehicleOptions.condition.Undamaged') },
      { value: ConditionType.Damaged, label: t('vehicleOptions.condition.Damaged') },
      { value: ConditionType.ForParts, label: t('vehicleOptions.condition.ForParts') },
    ]);
  }, [t]);

  const getRegistrationTypeOptions = useCallback(() => {
    return sortOptionsByLabel([
      { value: RegistrationType.Local, label: t('searchFilters.registrationTypeOptions.Local') },
      {
        value: RegistrationType.Foreign,
        label: t('searchFilters.registrationTypeOptions.Foreign'),
      },
      {
        value: RegistrationType.Cleared,
        label: t('searchFilters.registrationTypeOptions.Cleared'),
      },
    ]);
  }, [t]);

  const REGISTRATION_OPTIONS: Array<LabeledOption> = [
    { value: '', label: t('searchFilters.all') },
    ...sortOptionsByLabel([
      { value: 'true', label: t('searchFilters.registered') },
      { value: 'false', label: t('searchFilters.notRegistered') },
    ]),
  ];

  const getBrandOptions = useCallback(() => {
    const popularBrandsList = getPopularBrands(vehicleType);
    const popularBrands = sortByName(
      brands.filter((brand) => popularBrandsList.includes(brand.name))
    );
    const otherBrands = sortByName(
      brands.filter((brand) => !popularBrandsList.includes(brand.name))
    );

    const options: Array<{ value: string; label: string; category?: string }> = [
      { value: 'all', label: t('searchFilters.allBrands') },
    ];

    if (popularBrands.length > 0) {
      const popularLabel = t('searchFilters.popular');
      options.push({ value: '__category__Популарни', label: popularLabel, category: popularLabel });
      popularBrands.forEach((brand) => {
        options.push({ value: brand.id, label: brand.name, category: popularLabel });
      });
    }

    if (otherBrands.length > 0) {
      const otherLabel = t('searchFilters.other');
      options.push({ value: '__category__Други', label: otherLabel, category: otherLabel });
      otherBrands.forEach((brand) => {
        options.push({ value: brand.id, label: brand.name, category: otherLabel });
      });
    }

    return options;
  }, [brands, vehicleType, t]);

  const getModelOptions = useCallback(() => {
    const options: Array<{ value: string; label: string; category?: string }> = [
      { value: 'all', label: t('searchFilters.allModels') },
    ];

    if (filters.brand_ids.length >= 2) {
      const brandsMap = new Map(brands.map((b) => [b.id, b]));
      const modelsByBrand = new Map<string, VehicleModel[]>();

      models.forEach((model) => {
        if (!modelsByBrand.has(model.brand_id)) {
          modelsByBrand.set(model.brand_id, []);
        }
        modelsByBrand.get(model.brand_id)!.push(model);
      });

      const sortedBrandIds = [...filters.brand_ids].sort((a, b) => {
        const brandA = brandsMap.get(a);
        const brandB = brandsMap.get(b);
        if (!brandA || !brandB) return 0;
        return compareNames(brandA.name, brandB.name);
      });

      sortedBrandIds.forEach((brandId) => {
        const brand = brandsMap.get(brandId);
        if (brand) {
          const brandModels = modelsByBrand.get(brandId) || [];
          if (brandModels.length > 0) {
            const sortedModels = sortByName(brandModels);
            options.push({
              value: `__category__${brand.id}`,
              label: brand.name,
              category: brand.name,
            });
            sortedModels.forEach((model) => {
              options.push({ value: model.id, label: model.name, category: brand.name });
            });
          }
        }
      });
    } else {
      const sortedModels = sortByName(models);
      sortedModels.forEach((model) => {
        options.push({ value: model.id, label: model.name });
      });
    }

    return options;
  }, [models, brands, filters.brand_ids, t]);

  const getCityOptions = useCallback(() => {
    const popularCities = sortByName(
      cities.filter((city) => POPULAR_CITY_NAMES_EN.includes(city.nameEn))
    );
    const otherCities = sortByName(
      cities.filter((city) => !POPULAR_CITY_NAMES_EN.includes(city.nameEn))
    );

    const options: Array<{ value: string; label: string; category?: string }> = [
      { value: 'all', label: t('searchFilters.allCities') },
    ];

    if (popularCities.length > 0) {
      const popularLabel = t('searchFilters.popular');
      options.push({ value: '__category__Популарни', label: popularLabel, category: popularLabel });
      popularCities.forEach((city) => {
        options.push({
          value: city.nameEn,
          label: `${city.name} (${city.nameEn})`,
          category: popularLabel,
        });
      });
    }

    if (otherCities.length > 0) {
      const otherLabel = t('searchFilters.other');
      options.push({ value: '__category__Други', label: otherLabel, category: otherLabel });
      otherCities.forEach((city) => {
        options.push({
          value: city.nameEn,
          label: `${city.name} (${city.nameEn})`,
          category: otherLabel,
        });
      });
    }

    return options;
  }, [cities, t]);

  return {
    COLOR_OPTIONS,
    getConditionOptions,
    getRegistrationTypeOptions,
    REGISTRATION_OPTIONS,
    getBrandOptions,
    getModelOptions,
    getCityOptions,
  };
}
