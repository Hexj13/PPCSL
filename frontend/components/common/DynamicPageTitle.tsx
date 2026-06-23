'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { brandsApi, tiresApi } from '@/lib/api';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/content/popular-brands';
import {
  buildHomeBrandTitle,
  buildHomeCategoryTitle,
  createSlug,
  slugMatches,
  slugToName,
  type HomePageCategory,
} from '@/lib/utils';

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

function resolveBrandValueFromSlugs(
  brandParam: string | null,
  modelParam: string | null,
): string | null {
  if (!brandParam && !modelParam) return null;
  const brandSlugs = brandParam ? brandParam.split(',').map((s) => s.trim().toLowerCase()) : [];
  const modelSlugs = modelParam ? modelParam.split(',').map((s) => s.trim().toLowerCase()) : [];
  const foundBrands = brandSlugs
    .map((slug) => POPULAR_BRANDS.find((b) => b.toLowerCase() === slug || createSlug(b) === slug))
    .filter((name): name is string => name !== undefined);
  if (foundBrands.length === 0) return null;

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
    if (foundModels.length > 0) return foundModels.join(', ');
    if (foundBrands.length === 1) {
      return `${foundBrands[0]} ${modelSlugs.map((s) => slugToName(s)).join(', ')}`;
    }
  }

  return foundBrands.length === 1 ? foundBrands[0] : foundBrands.join(', ');
}

function resolveBodyTypeValue(
  bodyTypesParam: string,
  hasEncodedArrays: boolean,
  t: (_key: string) => string,
): string | null {
  const bodyTypes = hasEncodedArrays
    ? decodeArray(bodyTypesParam)
    : bodyTypesParam
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
  if (bodyTypes.length === 0) return null;
  const bodyTypeLabels = bodyTypes
    .map((bt) => {
      try {
        return t(`vehicleOptions.bodyType.${bt}`);
      } catch {
        return null;
      }
    })
    .filter((label): label is string => Boolean(label));
  if (bodyTypeLabels.length === 0) return null;
  return bodyTypeLabels.join(', ');
}

function setDocumentTitleFromValue(
  t: (_key: string) => string,
  category: HomePageCategory,
  value: string | null,
) {
  if (value) {
    document.title = buildHomeBrandTitle(t, value);
    return;
  }
  document.title = buildHomeCategoryTitle(t, category);
}

export function DynamicPageTitle() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
    const categoryParam = searchParams.get('category');
    const isTireCategory = categoryParam === 'tire';
    const vehicleTypeParam = searchParams.get('vehicleType');
    const vehicleType: 'car' | 'truck' | 'moto' =
      typeof vehicleTypeParam === 'string' && ['car', 'truck', 'moto'].includes(vehicleTypeParam)
        ? (vehicleTypeParam as 'car' | 'truck' | 'moto')
        : 'car';
    const homeCategory: HomePageCategory = isTireCategory ? 'tire' : vehicleType;

    if (isTireCategory) {
      const tireBrandIds = searchParams.get('tire_brand_ids');
      const tireModelIds = searchParams.get('tire_model_ids');
      setDocumentTitleFromValue(t, homeCategory, null);
      tiresApi
        .getSearchMetadata({
          tire_brand_ids: tireBrandIds ?? undefined,
          tire_model_ids: tireModelIds ?? undefined,
        })
        .then((res) => {
          const value = res.data.title ?? null;
          setDocumentTitleFromValue(t, homeCategory, value);
        })
        .catch(() => {
          setDocumentTitleFromValue(t, homeCategory, null);
        });
      return;
    }

    const brandParam = searchParams.get('brand');
    const modelParam = searchParams.get('model');
    const bodyTypesParam = searchParams.get('body_types');
    const hasEncodedArrays = searchParams.get('_e') === '1';

    if (bodyTypesParam && !brandParam && !modelParam) {
      const bodyValue = resolveBodyTypeValue(bodyTypesParam, hasEncodedArrays, t);
      if (bodyValue) {
        setDocumentTitleFromValue(t, homeCategory, bodyValue);
        return;
      }
    }

    if (!brandParam && !modelParam) {
      setDocumentTitleFromValue(t, homeCategory, null);
      return;
    }

    const fallbackValue = resolveBrandValueFromSlugs(brandParam, modelParam);
    setDocumentTitleFromValue(t, homeCategory, fallbackValue);

    brandsApi
      .getSearchMetadata({
        brand: brandParam ?? undefined,
        model: modelParam ?? undefined,
        vehicleType,
      })
      .then((res) => {
        const value = res.data.title ?? fallbackValue;
        setDocumentTitleFromValue(t, homeCategory, value);
      })
      .catch(() => {
        setDocumentTitleFromValue(t, homeCategory, fallbackValue);
      });
  }, [searchParams, t]);

  return null;
}
