'use client';

import { useState, useRef, useEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

interface ListingPageDescriptionProps {
  descriptionHtml: string | null;
}

export function ListingPageDescription({ descriptionHtml }: ListingPageDescriptionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(true);
  const [fullHeight, setFullHeight] = useState<number>(400);
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!surfaceRef.current || !descriptionHtml) return;

    const checkHeight = () => {
      if (surfaceRef.current) {
        const currentMaxHeight = surfaceRef.current.style.maxHeight;
        const currentTransition = surfaceRef.current.style.transition;

        surfaceRef.current.style.maxHeight = 'none';
        surfaceRef.current.style.transition = 'none';

        const height = surfaceRef.current.scrollHeight;

        surfaceRef.current.style.maxHeight = currentMaxHeight;
        surfaceRef.current.style.transition = currentTransition;

        const isLong = height > 400;
        setNeedsExpansion(isLong);
        setFullHeight(height);
      }
    };

    setTimeout(checkHeight, 100);
  }, [descriptionHtml, isExpanded]);

  const handleToggle = () => {
    if (isExpanded && surfaceRef.current) {
      setTimeout(() => {
        const element = surfaceRef.current;
        if (element) {
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - 110;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
        }
      }, 50);
    }
    setIsExpanded(!isExpanded);
  };

  if (!descriptionHtml) {
    return (
      <div className="surface" style={{ height: '400px' }}>
        <div className="h-10 bg-primary-500/10 rounded mb-4 animate-pulse w-32" />
        <div className="space-y-3">
          <div className="h-4 bg-primary-500/10 rounded animate-pulse" />
          <div className="h-4 bg-primary-500/10 rounded animate-pulse w-5/6" />
          <div className="h-4 bg-primary-500/10 rounded animate-pulse" />
          <div className="h-4 bg-primary-500/10 rounded animate-pulse w-4/5" />
          <div className="h-4 bg-primary-500/10 rounded animate-pulse" />
          <div className="h-4 bg-primary-500/10 rounded animate-pulse w-11/12" />
          <div className="h-4 bg-primary-500/10 rounded animate-pulse" />
          <div className="h-4 bg-primary-500/10 rounded animate-pulse w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={surfaceRef}
      className="surface overflow-hidden relative"
      style={{
        maxHeight: isExpanded ? `${fullHeight}px` : '400px',
        transition: 'max-height 0.4s ease-in-out',
      }}
    >
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-700">
        {t('listingDetail.description')}
      </h2>
      <div
        className="leading-relaxed max-w-none listing-description whitespace-pre-wrap"
        style={{
          color: 'rgb(var(--text-secondary-rgb))',
          paddingBottom: needsExpansion ? '60px' : '0',
        }}
        dangerouslySetInnerHTML={{
          __html: descriptionHtml,
        }}
      />
      {!isExpanded && needsExpansion && (
        <div
          className="absolute left-0 right-0 bottom-0 pointer-events-none"
          style={{
            height: '100px',
            background:
              'linear-gradient(to top, rgb(var(--bg-secondary-rgb, 244, 244, 244)) 0%, rgb(var(--bg-secondary-rgb, 244, 244, 244)) 40px, transparent 100%)',
          }}
        />
      )}
      {needsExpansion && (
        <div className="absolute left-0 right-0 bottom-4 flex justify-center z-10">
          <button
            onClick={handleToggle}
            className="px-4 py-2 text-primary-400 hover:text-primary-300 transition-colors duration-200 text-sm font-medium border border-primary-500/30 rounded-lg hover:border-primary-500/50 bg-bg-secondary"
          >
            {isExpanded ? t('listingDetail.collapse') : t('listingDetail.expand')}
          </button>
        </div>
      )}
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
