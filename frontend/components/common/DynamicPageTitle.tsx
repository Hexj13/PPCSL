'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { brandsApi, tiresApi } from '@/lib/api';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/content/popular-brands';
import { createSlug, slugMatches, slugToName } from '@/lib/utils';

const decodeArray = (encoded: string): string[] => {
  if (!encoded) return [];
  try {
    let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    const decoded = atob(base64);
    return JSON.parse(decoded);
  } catch {
    return [];
  }
};

function getFallbackTitle(
  brandParam: string | null,
  modelParam: string | null,
  vehicleTypeLabel: string,
  baseTitle: string,
): string {
  if (!brandParam && !modelParam) {
    return vehicleTypeLabel ? `${vehicleTypeLabel} | ${baseTitle}` : baseTitle;
  }
  const brandSlugs = brandParam ? brandParam.split(',').map((s) => s.trim().toLowerCase()) : [];
  const modelSlugs = modelParam ? modelParam.split(',').map((s) => s.trim().toLowerCase()) : [];
  const foundBrands = brandSlugs
    .map((slug) => POPULAR_BRANDS.find((b) => b.toLowerCase() === slug || createSlug(b) === slug))
    .filter((name): name is string => name !== undefined);
  if (foundBrands.length === 0) return baseTitle;
  if (modelSlugs.length > 0 && foundBrands.length > 0) {
    const foundModels: string[] = [];
    foundBrands.forEach((brandName) => {
      const models = POPULAR_MODELS_BY_BRAND[brandName] || [];
      modelSlugs.forEach((modelSlug) => {
        const model = models.find(
          (m) =>
            m.toLowerCase() === modelSlug ||
            createSlug(m) === modelSlug ||
            slugMatches(modelSlug, m),
        );
        if (model) foundModels.push(`${brandName} ${model}`);
      });
    });
    if (foundModels.length > 0) {
      const title = vehicleTypeLabel
        ? `${foundModels.join(', ')} | ${vehicleTypeLabel}`
        : foundModels.join(', ');
      return `${title} | ${baseTitle}`;
    }
    if (foundBrands.length === 1) {
      const title = vehicleTypeLabel
        ? `${foundBrands[0]} ${modelSlugs.map((s) => slugToName(s)).join(', ')} | ${vehicleTypeLabel}`
        : `${foundBrands[0]} ${modelSlugs.map((s) => slugToName(s)).join(', ')}`;
      return `${title} | ${baseTitle}`;
    }
  }
  const brandsTitle = foundBrands.length === 1 ? foundBrands[0] : foundBrands.join(', ');
  const title = vehicleTypeLabel ? `${brandsTitle} | ${vehicleTypeLabel}` : brandsTitle;
  return `${title} | ${baseTitle}`;
}

export function DynamicPageTitle() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    if (categoryParam === 'tire') {
      const tiresBaseTitle = t('metadata.site.tiresDefaultTitle');
      const tireBrandIds = searchParams.get('tire_brand_ids');
      const tireModelIds = searchParams.get('tire_model_ids');
      document.title = tiresBaseTitle;
      tiresApi
        .getSearchMetadata({
          tire_brand_ids: tireBrandIds ?? undefined,
          tire_model_ids: tireModelIds ?? undefined,
        })
        .then((res) => {
          const title = res.data.title ?? tiresBaseTitle;
          document.title = title === tiresBaseTitle ? title : `${title} | ${tiresBaseTitle}`;
        })
        .catch(() => {
          document.title = tiresBaseTitle;
        });
      return;
    }

    const brandParam = searchParams.get('brand');
    const modelParam = searchParams.get('model');
    const bodyTypesParam = searchParams.get('body_types');
    const vehicleTypeParam = searchParams.get('vehicleType');
    const hasEncodedArrays = searchParams.get('_e') === '1';

    const vehicleType =
      typeof vehicleTypeParam === 'string' && ['car', 'truck', 'moto'].includes(vehicleTypeParam)
        ? vehicleTypeParam
        : 'car';

    const getVehicleTypeLabel = (type: string): string => {
      try {
        const key = `listings.vehicleTypeFull.${type}`;
        const value = t(key);
        return value === key ? '' : value;
      } catch {
        return '';
      }
    };

    const vehicleTypeLabel = getVehicleTypeLabel(vehicleType);
    const baseTitle = t('metadata.site.defaultTitle');

    if (bodyTypesParam && !brandParam && !modelParam) {
      const bodyTypes = hasEncodedArrays
        ? decodeArray(bodyTypesParam)
        : bodyTypesParam
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
      if (bodyTypes.length > 0) {
        const bodyTypeLabels = bodyTypes
          .map((bt) => {
            try {
              return t(`vehicleOptions.bodyType.${bt}`);
            } catch {
              return null;
            }
          })
          .filter((label): label is string => Boolean(label));
        if (bodyTypeLabels.length > 0) {
          const title = vehicleTypeLabel
            ? `${bodyTypeLabels.join(', ')} | ${vehicleTypeLabel}`
            : bodyTypeLabels.join(', ');
          document.title = `${title} | ${baseTitle}`;
          return;
        }
      }
    }

    if (!brandParam && !modelParam) {
      document.title = vehicleTypeLabel ? `${vehicleTypeLabel} | ${baseTitle}` : baseTitle;
      return;
    }

    const vehicleTypeForApi = vehicleType as 'car' | 'truck' | 'moto' | undefined;

    document.title = getFallbackTitle(brandParam, modelParam, vehicleTypeLabel, baseTitle);

    brandsApi
      .getSearchMetadata({
        brand: brandParam ?? undefined,
        model: modelParam ?? undefined,
        vehicleType: vehicleTypeForApi,
      })
      .then((res) => {
        if (res.data.title) {
          const title = vehicleTypeLabel
            ? `${res.data.title} | ${vehicleTypeLabel}`
            : res.data.title;
          document.title = `${title} | ${baseTitle}`;
        } else {
          document.title = getFallbackTitle(brandParam, modelParam, vehicleTypeLabel, baseTitle);
        }
      })
      .catch(() => {
        document.title = getFallbackTitle(brandParam, modelParam, vehicleTypeLabel, baseTitle);
      });
  }, [searchParams, t]);

  return null;
}
