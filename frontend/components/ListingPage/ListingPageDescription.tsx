'use client';

import { useTranslation } from '@/hooks/useTranslation';

interface ListingPageDescriptionProps {
  descriptionHtml: string | null;
}

export function ListingPageDescription({ descriptionHtml }: ListingPageDescriptionProps) {
  const { t } = useTranslation();

  if (!descriptionHtml) {
    return null;
  }

  return (
    <div className="surface overflow-hidden">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-400">
        {t('listingDetail.description')}
      </h2>
      <div
        className="leading-relaxed max-w-none listing-description whitespace-pre-wrap"
        style={{ color: 'rgb(var(--text-secondary-rgb))' }}
        dangerouslySetInnerHTML={{
          __html: descriptionHtml,
        }}
      />
      <style jsx>{`
        .listing-description {
          color: rgb(var(--text-secondary-rgb));
          line-height: 1.75;
        }
        .listing-description div,
        .listing-description p {
          display: block;
          margin: 0.75rem 0;
          min-height: 1.2em;
          line-height: 1.6;
          color: rgb(var(--text-secondary-rgb));
        }
        .listing-description div:empty,
        .listing-description p:empty {
          min-height: 1.5rem;
          margin: 0.5rem 0;
        }
        .listing-description div:first-child,
        .listing-description p:first-child {
          margin-top: 0;
        }
        .listing-description div:last-child,
        .listing-description p:last-child {
          margin-bottom: 0;
        }
        .listing-description p:has(br:only-child) {
          min-height: 1.5rem;
          margin: 0.5rem 0;
        }
        .listing-description font[size='2'] {
          font-size: 0.875rem !important;
        }
        .listing-description font[size='3'] {
          font-size: 1rem !important;
        }
        .listing-description font[size='5'] {
          font-size: 1.125rem !important;
        }
        .listing-description strong,
        .listing-description b {
          font-weight: 700 !important;
          color: rgb(var(--text-secondary-rgb)) !important;
        }
        .listing-description em,
        .listing-description i {
          font-style: italic !important;
          color: rgb(var(--text-secondary-rgb)) !important;
        }
        .listing-description u {
          text-decoration: underline;
          color: rgb(var(--text-secondary-rgb));
        }
        .listing-description ul {
          list-style-type: disc !important;
          list-style-position: outside !important;
          display: block !important;
          margin: 0.75rem 0 !important;
          padding-left: 2rem !important;
          color: rgb(var(--text-secondary-rgb)) !important;
        }
        .listing-description ol {
          list-style-type: decimal !important;
          list-style-position: outside !important;
          display: block !important;
          margin: 0.75rem 0 !important;
          padding-left: 2rem !important;
          color: rgb(var(--text-secondary-rgb)) !important;
        }
        .listing-description li {
          display: list-item !important;
          list-style-position: outside !important;
          margin: 0.25rem 0 !important;
          padding-left: 0.5rem !important;
          color: rgb(var(--text-secondary-rgb)) !important;
        }
        .listing-description ul li {
          list-style-type: disc !important;
          list-style-position: outside !important;
        }
        .listing-description ol li {
          list-style-type: decimal !important;
          list-style-position: outside !important;
        }
      `}</style>
    </div>
  );
}
