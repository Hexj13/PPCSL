'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { brandsApi } from '@/lib/api';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/popular-brands';
import { createSlug } from '@/lib/utils';

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

export function DynamicPageTitle() {
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  useEffect(() => {
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
        const key = `vehicleOptions.vehicleTypeFull.${type}`;
        const value = t(key);
        if (value === key) {
          switch (type) {
            case 'truck':
              return 'Комерцијален';
            case 'moto':
              return 'Мотоцикли';
            case 'car':
            default:
              return '';
          }
        }
        return value;
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
          const bodyTypeTitle = bodyTypeLabels.join(', ');
          const title = vehicleTypeLabel ? `${bodyTypeTitle} | ${vehicleTypeLabel}` : bodyTypeTitle;
          document.title = `${title} | ${baseTitle}`;
          return;
        }
      }
    }

    if (!brandParam && !modelParam) {
      const title = vehicleTypeLabel ? `${vehicleTypeLabel} | ${baseTitle}` : baseTitle;
      document.title = title;
      return;
    }

    const brandSlugs = brandParam ? brandParam.split(',').map((s) => s.trim().toLowerCase()) : [];
    const modelSlugs = modelParam ? modelParam.split(',').map((s) => s.trim().toLowerCase()) : [];

    const quickTitle = (() => {
      const foundBrands = brandSlugs
        .map((slug) => {
          return POPULAR_BRANDS.find((b) => b.toLowerCase() === slug || createSlug(b) === slug);
        })
        .filter((name): name is string => name !== undefined);

      if (foundBrands.length === 0) {
        return null;
      }

      if (modelSlugs.length > 0 && foundBrands.length > 0) {
        const foundModels: string[] = [];
        foundBrands.forEach((brandName) => {
          const models = POPULAR_MODELS_BY_BRAND[brandName] || [];
          modelSlugs.forEach((modelSlug) => {
            const model = models.find(
              (m) => m.toLowerCase() === modelSlug || createSlug(m) === modelSlug
            );
            if (model) {
              foundModels.push(`${brandName} ${model}`);
            }
          });
        });

        if (foundModels.length > 0) {
          return foundModels.join(', ');
        }
      }

      return foundBrands.length === 1 ? foundBrands[0] : foundBrands.join(', ');
    })();

    if (quickTitle) {
      const title = vehicleTypeLabel ? `${quickTitle} | ${vehicleTypeLabel}` : quickTitle;
      document.title = `${title} | ${baseTitle}`;
    }

    const updateTitle = async () => {
      try {
        const brands = await brandsApi.getAll();
        const brandSlugs = brandParam ? brandParam.split(',').map((s) => s.trim()) : [];
        const foundBrands = brandSlugs
          .map((slug) => {
            const brand = brands.data.find(
              (b) =>
                b.name.toLowerCase() === slug.toLowerCase() ||
                createSlug(b.name) === slug.toLowerCase()
            );
            return brand?.name;
          })
          .filter((name): name is string => name !== undefined);

        if (foundBrands.length === 0) {
          document.title = baseTitle;
          return;
        }

        let newTitle = '';

        if (modelParam && foundBrands.length > 0) {
          const brandIds = foundBrands
            .map((brandName) => brands.data.find((b) => b.name === brandName)?.id)
            .filter((id): id is string => id !== undefined);

          if (brandIds.length > 0) {
            const modelsByBrand = await brandsApi.getModelsBatch(brandIds);
            const allModels = Object.values(modelsByBrand.data).flat();
            const modelSlugs = modelParam.split(',').map((s) => s.trim());
            const foundModels = modelSlugs
              .map((slug) => {
                const model = allModels.find(
                  (m) =>
                    m.name.toLowerCase() === slug.toLowerCase() ||
                    createSlug(m.name) === slug.toLowerCase()
                );
                return model?.name;
              })
              .filter((name): name is string => name !== undefined);

            if (foundModels.length > 0) {
              if (foundBrands.length === 1 && foundModels.length === 1) {
                newTitle = `${foundBrands[0]} ${foundModels[0]}`;
              } else if (foundBrands.length === 1) {
                newTitle = `${foundBrands[0]} ${foundModels.join(', ')}`;
              } else {
                const brandModelPairs: string[] = [];
                foundBrands.forEach((brandName) => {
                  const brandId = brands.data.find((b) => b.name === brandName)?.id;
                  if (brandId) {
                    const brandModels = modelsByBrand.data[brandId] || [];
                    const matchingModels = foundModels.filter((modelName) =>
                      brandModels.some((m) => m.name === modelName)
                    );
                    if (matchingModels.length > 0) {
                      matchingModels.forEach((modelName) => {
                        brandModelPairs.push(`${brandName} ${modelName}`);
                      });
                    }
                  }
                });
                newTitle = brandModelPairs.join(', ');
              }
            } else {
              newTitle = foundBrands.length === 1 ? foundBrands[0] : foundBrands.join(', ');
            }
          } else {
            newTitle = foundBrands.length === 1 ? foundBrands[0] : foundBrands.join(', ');
          }
        } else {
          newTitle = foundBrands.length === 1 ? foundBrands[0] : foundBrands.join(', ');
        }

        if (newTitle) {
          const title = vehicleTypeLabel ? `${newTitle} | ${vehicleTypeLabel}` : newTitle;
          document.title = `${title} | ${baseTitle}`;
        } else {
          document.title = baseTitle;
        }
      } catch (error) {
        console.error('Failed to update page title:', error);
        document.title = baseTitle;
      }
    };

    updateTitle();
  }, [searchParams, t]);

  return null;
}
