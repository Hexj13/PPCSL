'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import {
  isModelCatalogEnabled,
  MODEL_CATALOG_RANGES,
  modelCatalogRangeLabel,
} from '@/lib/catalog/model-catalog-ranges';
import { POPULAR_BRANDS } from '@/lib/content/popular-brands';
import { compareNames, createSlug } from '@/lib/utils';
import { ChevronDownIcon } from '@/ui';

import { FOOTER_LINK_CLASSES, FOOTER_LINK_LABEL_CLASSES } from './footerClasses';

function FooterTextLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className={FOOTER_LINK_CLASSES} suppressHydrationWarning>
      <span className={FOOTER_LINK_LABEL_CLASSES} suppressHydrationWarning>
        {label}
      </span>
    </Link>
  );
}

function FooterCatalogRow({
  label,
  links,
  contentId,
}: {
  label: string;
  links: Array<{ key: string; href: string; text: string }>;
  contentId: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav aria-label={label}>
      <div className="md:hidden">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-300 focus-visible:ring-offset-2 focus-visible:ring-offset-primary-700"
          aria-expanded={isOpen}
          aria-controls={contentId}
          onClick={() => setIsOpen((prev) => !prev)}
        >
          <span className="text-white" suppressHydrationWarning>
            {label}
          </span>
          <ChevronDownIcon
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ease-out ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        <div
          id={contentId}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="flex flex-col items-center gap-y-2 pt-3">
              {links.map((link) => (
                <FooterTextLink key={link.key} href={link.href} label={link.text} />
              ))}
            </div>
          </div>
        </div>
      </div>
      <p className="hidden flex-wrap items-baseline justify-center gap-x-2 gap-y-1 text-center md:flex">
        <span className="text-white" suppressHydrationWarning>
          {label}
        </span>
        {links.map((link) => (
          <FooterTextLink key={link.key} href={link.href} label={link.text} />
        ))}
      </p>
    </nav>
  );
}

export function FooterCatalogLinks() {
  const { t } = useTranslation();
  const { href } = useLocalizedNavigation();
  const brands = useMemo(() => [...POPULAR_BRANDS].sort(compareNames), []);

  const brandLinks = useMemo(
    () =>
      brands.map((brand) => ({
        key: brand,
        href: href(`/${createSlug(brand)}`),
        text: brand,
      })),
    [brands, href],
  );

  const modelLinks = useMemo(
    () =>
      MODEL_CATALOG_RANGES.map((range) => ({
        key: range,
        href: href(`/catalog/models/${range}`),
        text: modelCatalogRangeLabel(range),
      })),
    [href],
  );

  if (!isModelCatalogEnabled()) {
    return null;
  }

  return (
    <div className="border-t border-primary-500/25 bg-primary-700">
      <div className="container mx-auto flex flex-col gap-3 px-3 py-4 text-sm text-white/80 sm:px-4">
        {brandLinks.length > 0 ? (
          <FooterCatalogRow
            label={t('footer.popularManufacturers')}
            links={brandLinks}
            contentId="footer-catalog-brands"
          />
        ) : null}
        <FooterCatalogRow
          label={t('footer.carModels')}
          links={modelLinks}
          contentId="footer-catalog-models"
        />
      </div>
    </div>
  );
}
