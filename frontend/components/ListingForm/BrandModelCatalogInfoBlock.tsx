'use client';

import Link from 'next/link';

import { useTranslation } from '@/hooks/useTranslation';
import { ExternalLinkIcon, InfoBlock } from '@/ui';

export function BrandModelCatalogInfoBlock({ className = 'mb-5' }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <InfoBlock className={className}>
      <p>
        {t('listings.brandModelInfoBefore')}
        <Link
          href="/contacts"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary-900 underline underline-offset-2 hover-only:hover:opacity-90"
          aria-label={`${t('listings.brandModelInfoContactLink')}, ${t('contacts.openInNewTab')}`}
        >
          {t('listings.brandModelInfoContactLink')}
          <ExternalLinkIcon className="w-3.5 h-3.5 shrink-0" aria-hidden />
        </Link>
        {t('listings.brandModelInfoAfter')}
      </p>
    </InfoBlock>
  );
}
