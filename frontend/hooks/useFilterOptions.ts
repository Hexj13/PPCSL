import { useCallback } from 'react';

import { useI18n } from '@/components/providers/I18nProvider';
import type { useTranslation } from '@/hooks/useTranslation';
import type { Brand, VehicleModel } from '@/lib/api';
import type { City } from '@/lib/api';
import { ConditionType, RegistrationType } from '@/lib/constants';
import { getPopularBrands } from '@/lib/content/popular-brands';
import { getColorOptions } from '@/lib/options';
import { compareNames, getCountry, sortByName, sortOptionsByLabel } from '@/lib/utils';

import type { FilterState } from './useSearchFilters';

type TranslationFunction = ReturnType<typeof useTranslation>['t'];

const getPopularCityNamesEn = (): string[] => {
  const country = getCountry();
  if (country === 'md') {
    return ['Chișinău', 'Bălți', 'Tiraspol', 'Bender', 'Orhei'];
  }
  return ['Skopje', 'Bitola', 'Kumanovo', 'Prilep', 'Tetovo'];
};

const POPULAR_CITY_NAMES_EN = getPopularCityNamesEn();

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
  const { locale } = useI18n();
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
      {
        value: RegistrationType.NotCleared,
        label: t('searchFilters.registrationTypeOptions.NotCleared'),
      },
    ]);
  }, [t]);

  const getBrandOptions = useCallback(() => {
    const popularBrandsList = getPopularBrands(vehicleType);
    const popularBrands = sortByName(
      brands.filter((brand) => popularBrandsList.includes(brand.name)),
    );
    const otherBrands = sortByName(
      brands.filter((brand) => !popularBrandsList.includes(brand.name)),
    );

    const options: Array<{ value: string; label: string; category?: string }> = [];

    if (popularBrands.length > 0) {
      const popularLabel = t('searchFilters.popular');
      options.push({ value: '__category__popular', label: popularLabel, category: popularLabel });
      popularBrands.forEach((brand) => {
        options.push({ value: brand.id, label: brand.name, category: popularLabel });
      });
    }

    if (otherBrands.length > 0) {
      const otherLabel = t('searchFilters.other');
      options.push({ value: '__category__other', label: otherLabel, category: otherLabel });
      otherBrands.forEach((brand) => {
        options.push({ value: brand.id, label: brand.name, category: otherLabel });
      });
    }

    return options;
  }, [brands, vehicleType, t]);

  const getModelOptions = useCallback(() => {
    const options: Array<{ value: string; label: string; category?: string }> = [];

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
  }, [models, brands, filters.brand_ids]);

  const getCityOptions = useCallback(() => {
    const popularCities = sortByName(
      cities.filter((city) => POPULAR_CITY_NAMES_EN.includes(city.nameEn)),
    );
    const otherCities = sortByName(
      cities.filter((city) => !POPULAR_CITY_NAMES_EN.includes(city.nameEn)),
    );

    const options: Array<{ value: string; label: string; category?: string }> = [];

    if (popularCities.length > 0) {
      const popularLabel = t('searchFilters.popular');
      options.push({ value: '__category__popular', label: popularLabel, category: popularLabel });
      popularCities.forEach((city) => {
        let label: string;
        if (locale === 'ro') {
          label = city.name;
        } else if (locale === 'ru' && city.nameRu) {
          label = `${city.nameRu} (${city.name})`;
        } else {
          label = city.name;
        }
        options.push({
          value: city.nameEn,
          label,
          category: popularLabel,
        });
      });
    }

    if (otherCities.length > 0) {
      const otherLabel = t('searchFilters.other');
      options.push({ value: '__category__other', label: otherLabel, category: otherLabel });
      otherCities.forEach((city) => {
        let label: string;
        if (locale === 'ro') {
          label = city.name;
        } else if (locale === 'ru' && city.nameRu) {
          label = `${city.nameRu} (${city.name})`;
        } else {
          label = city.name;
        }
        options.push({
          value: city.nameEn,
          label,
          category: otherLabel,
        });
      });
    }

    return options;
  }, [cities, t, locale]);

  return {
    COLOR_OPTIONS,
    getConditionOptions,
    getRegistrationTypeOptions,
    getBrandOptions,
    getModelOptions,
    getCityOptions,
  };
}
