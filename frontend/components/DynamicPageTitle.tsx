'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { brandsApi } from '@/lib/api';
import { POPULAR_BRANDS, POPULAR_MODELS_BY_BRAND } from '@/lib/popular-brands';
import { createSlug } from '@/lib/utils';

export function DynamicPageTitle() {
  const searchParams = useSearchParams();

  useEffect(() => {
    const brandParam = searchParams.get('brand');
    const modelParam = searchParams.get('model');

    if (!brandParam && !modelParam) {
      document.title = 'Автомобили во Македонија';
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
      document.title = `${quickTitle} | Автомобили во Македонија`;
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
          document.title = 'Автомобили во Македонија';
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
          document.title = `${newTitle} | Автомобили во Македонија`;
        } else {
          document.title = 'Автомобили во Македонија';
        }
      } catch (error) {
        console.error('Failed to update page title:', error);
        document.title = 'Автомобили во Македонија';
      }
    };

    updateTitle();
  }, [searchParams]);

  return null;
}
