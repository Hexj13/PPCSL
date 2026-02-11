'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

interface ListingPageDescriptionProps {
  descriptionHtml: string | null;
}

const COLLAPSED_HEIGHT = 400;

export function ListingPageDescription({ descriptionHtml }: ListingPageDescriptionProps) {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentRef.current) return;

    const measure = () => {
      if (contentRef.current) {
        const height = contentRef.current.scrollHeight;
        setContentHeight(height);
        setNeedsExpansion(height > COLLAPSED_HEIGHT);
      }
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, [descriptionHtml]);

  const handleToggle = useCallback(() => {
    if (isExpanded && wrapperRef.current) {
      const el = wrapperRef.current;
      const offsetPosition = el.getBoundingClientRect().top + window.pageYOffset - 110;
      window.scrollTo({ top: offsetPosition, behavior: 'smooth' });
      setTimeout(() => setIsExpanded(false), 500);
    } else {
      setIsExpanded(true);
    }
  }, [isExpanded]);

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

  const targetHeight = isExpanded ? contentHeight : COLLAPSED_HEIGHT;

  return (
    <div ref={wrapperRef} className="surface relative">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-700">
        {t('listingDetail.description')}
      </h2>

      <div
        className="overflow-hidden relative"
        style={{
          maxHeight: `${targetHeight}px`,
          transition: 'max-height 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}
      >
        <div
          ref={contentRef}
          className="leading-relaxed max-w-none listing-description whitespace-pre-wrap"
          style={{
            color: 'rgb(var(--text-secondary-rgb))',
            paddingBottom: !needsExpansion ? '0' : isExpanded ? '24px' : '60px',
          }}
          dangerouslySetInnerHTML={{
            __html: descriptionHtml,
          }}
        />
      </div>

      {!isExpanded && needsExpansion && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            bottom: '0',
            height: '100px',
            background:
              'linear-gradient(to top, rgba(var(--bg-secondary-rgb, 244, 244, 244), 0.96) 0%, rgba(var(--bg-secondary-rgb, 244, 244, 244), 0.65) 40px, transparent 100%)',
          }}
        />
      )}

      {needsExpansion && (
        <div
          className={`flex justify-center ${isExpanded ? 'mt-0' : 'absolute left-0 right-0 bottom-4'}`}
          style={{ zIndex: 10 }}
        >
          <button
            onClick={handleToggle}
            className="btn-secondary !border-primary-500 min-h-0 flex items-center justify-center gap-2 !h-12 !min-h-12 !max-h-12"
          >
            {isExpanded ? (
              <>
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 16l5-5 5 5"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 11l5-5 5 5"
                  />
                </svg>
                {t('listingDetail.collapse')}
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8l5 5 5-5"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 13l5 5 5-5"
                  />
                </svg>
                {t('listingDetail.expand')}
              </>
            )}
          </button>
        </div>
      )}
      <style jsx>{`
        .listing-description {
          color: rgb(var(--text-secondary-rgb));
          line-height: 1.75;
          word-break: break-word;
          overflow-wrap: anywhere;
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
