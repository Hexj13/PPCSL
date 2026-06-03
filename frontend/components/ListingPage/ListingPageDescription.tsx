'use client';

import { useState, useRef, useEffect, useCallback, useLayoutEffect } from 'react';

import { useTranslation } from '@/hooks/useTranslation';
import { prepareListingDescriptionHtml } from '@/lib/listingDescriptionHtml';

interface ListingPageDescriptionProps {
  rawHtml: string;
}

const COLLAPSED_HEIGHT = 400;

export function ListingPageDescription({ rawHtml }: ListingPageDescriptionProps) {
  const { t } = useTranslation();
  const [preparedHtml, setPreparedHtml] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [needsExpansion, setNeedsExpansion] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (typeof window === 'undefined' || !rawHtml) {
      setPreparedHtml(null);
      return;
    }
    setPreparedHtml(prepareListingDescriptionHtml(rawHtml, window));
  }, [rawHtml]);

  useEffect(() => {
    if (!preparedHtml || !contentRef.current) return;

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
  }, [preparedHtml]);

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

  if (!rawHtml) {
    return null;
  }

  const ready = preparedHtml !== null;
  const targetHeight = ready ? (isExpanded ? contentHeight : COLLAPSED_HEIGHT) : COLLAPSED_HEIGHT;

  return (
    <div ref={wrapperRef} className="surface relative">
      <h2 className="text-xl md:text-2xl font-bold mb-4 text-primary-900">
        {t('listingDetail.description')}
      </h2>

      {!ready ? (
        <div
          className="rounded-lg bg-bg-secondary/15 min-h-[400px]"
          aria-busy="true"
          style={{ minHeight: COLLAPSED_HEIGHT }}
        >
          <div className="h-10 bg-primary-500/10 rounded-sm mb-4 animate-pulse w-32 mx-0" />
          <div className="space-y-3 px-0">
            <div className="h-4 bg-primary-500/10 rounded-sm animate-pulse" />
            <div className="h-4 bg-primary-500/10 rounded-sm animate-pulse w-5/6" />
            <div className="h-4 bg-primary-500/10 rounded-sm animate-pulse" />
          </div>
        </div>
      ) : (
        <>
          <div
            id="listing-description-content"
            className="overflow-hidden relative"
            style={{
              maxHeight: `${targetHeight}px`,
              transition: 'max-height 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
            }}
          >
            <div
              ref={contentRef}
              className="leading-relaxed max-w-none listing-description whitespace-pre-wrap [&_a]:text-primary-900 [&_a]:underline [&_a]:transition-colors [&_a]:duration-200 hover-only:[&_a:hover]:text-primary-700"
              style={{
                color: 'rgb(var(--text-secondary-rgb))',
              }}
              dangerouslySetInnerHTML={{
                __html: preparedHtml,
              }}
            />
            {!isExpanded && needsExpansion && (
              <div
                className="absolute left-0 right-0 bottom-0 pointer-events-none"
                style={{
                  height: '80px',
                  background:
                    'linear-gradient(to top, rgba(255, 255, 255, 0.96) 0%, rgba(255, 255, 255, 0.65) 40px, transparent 100%)',
                }}
              />
            )}
          </div>

          {needsExpansion && (
            <div className="flex justify-center mt-6">
              <button
                type="button"
                onClick={handleToggle}
                aria-expanded={isExpanded}
                aria-controls="listing-description-content"
                className="w-full md:w-auto min-h-12 px-8 py-2 md:py-2.5 text-sm rounded-lg font-medium transition-colors duration-200 flex items-center justify-center gap-2 border-2 border-gray-500 bg-gray-500/10 text-text-secondary hover-only:hover:text-text-primary select-none"
              >
                {isExpanded ? (
                  <>
                    <svg
                      className="w-5 h-5 shrink-0"
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
                      className="w-5 h-5 shrink-0"
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
        </>
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
