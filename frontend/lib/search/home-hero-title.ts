import { fetchSearchMetadata } from '@/lib/api';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/content/popular-brands';
import type { Translations } from '@/lib/i18n';
import { createSlug, slugToName } from '@/lib/utils';

import { isIndexableVehicleTypeParam } from './home-page-indexable-params';

function resolveModelDisplayName(brandKey: string, modelSlug: string): string {
  const models = POPULAR_MODELS_BY_BRAND[brandKey] || [];
  const slug = modelSlug.split(',')[0]?.trim() ?? modelSlug;
  return models.find((m) => createSlug(m) === slug.toLowerCase()) || slugToName(slug);
}

export async function getHomeHeroTitle(
  params: Record<string, string | string[] | undefined>,
  t: Translations,
): Promise<string> {
  const category = typeof params.category === 'string' ? params.category : null;
  if (category === 'tire') {
    return t.home.title;
  }

  const brand = typeof params.brand === 'string' ? params.brand : null;
  const model = typeof params.model === 'string' ? params.model : null;

  if (!brand?.trim() || brand.includes(',')) {
    return t.home.title;
  }
  if (model?.includes(',')) {
    return t.home.title;
  }

  const vehicleType = (
    isIndexableVehicleTypeParam(params.vehicleType) ? params.vehicleType : 'car'
  ) as 'car' | 'truck' | 'moto';

  const metadataFromApi = await fetchSearchMetadata({
    brand,
    model: model?.trim() ? model : undefined,
    vehicleType,
  });

  const displayBrand =
    metadataFromApi.brandName ??
    POPULAR_BRANDS.find((b) => createSlug(b) === brand.toLowerCase()) ??
    brand;

  const hasModelInUrl = Boolean(model?.trim());
  if (!hasModelInUrl) {
    return t.home.titleWithBrand.replaceAll('{brand}', displayBrand);
  }

  const apiModelName =
    metadataFromApi.modelNames && metadataFromApi.modelNames.length === 1
      ? metadataFromApi.modelNames[0]
      : undefined;
  const displayModel = apiModelName ?? resolveModelDisplayName(displayBrand, model!);

  return t.home.titleWithBrandModel
    .replaceAll('{brand}', displayBrand)
    .replaceAll('{model}', displayModel);
}
