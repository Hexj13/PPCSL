import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { fetchModelIndex } from '@/lib/api/server-api';
import {
  brandRangeSlug,
  isModelCatalogEnabled,
  isModelCatalogRange,
  modelCatalogRangeLabel,
  type ModelCatalogRange,
} from '@/lib/catalog/model-catalog-ranges';
import { getMetadataLocaleFromParams, getServerTranslations } from '@/lib/i18n';
import { buildSiteRobotsMetadata } from '@/lib/robots-metadata';
import { loadSiteConfigSync } from '@/lib/site-config';
import {
  canonicalForLocaleFromRo,
  hreflangLanguagesFromRoCanonical,
  isLanguageSwitcherEnabled,
  localePrefixPath,
} from '@/lib/url-locale';
import { compareNames, createSlug, getCountry } from '@/lib/utils';

export const revalidate = 3600;

const siteConfig = loadSiteConfigSync(getCountry());
const siteUrl = siteConfig.siteUrl;

function fillTemplate(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, value]) => acc.replaceAll(`{${key}}`, value),
    template,
  );
}

async function loadRangeItems(range: ModelCatalogRange) {
  const { items } = await fetchModelIndex();
  return items
    .filter((item) => brandRangeSlug(item.brand) === range)
    .map((item) => ({
      brand: item.brand,
      model: item.model,
      brandSlug: createSlug(item.brand),
      modelSlug: createSlug(item.model),
    }))
    .sort((a, b) => {
      const brandCmp = compareNames(a.brand, b.brand);
      if (brandCmp !== 0) return brandCmp;
      return compareNames(a.model, b.model);
    });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; range: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const locale = await getMetadataLocaleFromParams(resolvedParams);
  const t = getServerTranslations(locale);
  const rangeSlug = resolvedParams.range?.toLowerCase() ?? '';

  if (!isModelCatalogEnabled() || !isModelCatalogRange(rangeSlug)) {
    return {
      title: t.metadata.site.defaultTitle,
      robots: buildSiteRobotsMetadata({ index: false, follow: true }),
    };
  }

  const rangeLabel = modelCatalogRangeLabel(rangeSlug);
  const items = await loadRangeItems(rangeSlug);
  const isEmpty = items.length === 0;
  const title = fillTemplate(t.modelCatalog.title, { range: rangeLabel });
  const description = fillTemplate(t.modelCatalog.description, { range: rangeLabel });
  const roCanonical = `${siteUrl}/catalog/models/${rangeSlug}`;
  const canonical = canonicalForLocaleFromRo(roCanonical, locale);
  const alternates = isLanguageSwitcherEnabled()
    ? { canonical, languages: hreflangLanguagesFromRoCanonical(roCanonical) }
    : { canonical };

  return {
    title,
    description,
    alternates,
    robots: buildSiteRobotsMetadata({ index: !isEmpty, follow: true }),
  };
}

export default async function ModelCatalogRangePage({
  params,
}: {
  params: Promise<{ locale: string; range: string }>;
}) {
  if (!isModelCatalogEnabled()) {
    notFound();
  }

  const resolvedParams = await params;
  const locale = await getMetadataLocaleFromParams(resolvedParams);
  const t = getServerTranslations(locale);
  const rangeSlug = resolvedParams.range?.toLowerCase() ?? '';

  if (!isModelCatalogRange(rangeSlug)) {
    notFound();
  }

  const rangeLabel = modelCatalogRangeLabel(rangeSlug);
  const items = await loadRangeItems(rangeSlug);
  const title = fillTemplate(t.modelCatalog.title, { range: rangeLabel });

  return (
    <div className="max-w-6xl">
      <h1 className="mb-6 text-3xl font-extrabold text-primary-900 md:mb-8 md:text-4xl">{title}</h1>
      {items.length === 0 ? (
        <p className="text-base text-text-secondary md:text-lg">{t.modelCatalog.empty}</p>
      ) : (
        <ul className="columns-1 gap-x-8 sm:columns-2 lg:columns-3">
          {items.map((item) => {
            const href = localePrefixPath(`/${item.brandSlug}/${item.modelSlug}`, locale);
            return (
              <li key={`${item.brandSlug}-${item.modelSlug}`} className="mb-2 break-inside-avoid">
                <Link
                  href={href}
                  className="text-sm text-primary-700 underline-offset-2 transition-colors hover-only:hover:text-primary-900 hover-only:hover:underline md:text-base"
                >
                  {item.brand} {item.model}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
