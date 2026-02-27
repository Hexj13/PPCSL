'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

export function ScrollToFiltersButton() {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const [isVisible, setIsVisible] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  const filtersElementRef = useRef<HTMLElement | null>(null);
  const hasScrolledToFiltersRef = useRef<boolean>(false);
  const previousSearchParamsRef = useRef<string>('');
  const isInitialMountRef = useRef<boolean>(true);

  useEffect(() => {
    const checkParamsChange = () => {
      const getCurrentParams = () => {
        if (typeof window !== 'undefined') {
          return window.location.search;
        }
        return searchParams.toString();
      };

      const currentSearchParams = getCurrentParams();

      if (isInitialMountRef.current) {
        isInitialMountRef.current = false;
        previousSearchParamsRef.current = currentSearchParams;
        return;
      }

      if (previousSearchParamsRef.current !== currentSearchParams) {
        scrollPositionRef.current = 0;
        hasScrolledToFiltersRef.current = false;
        setShowBackButton(false);
        previousSearchParamsRef.current = currentSearchParams;

        if (typeof window !== 'undefined') {
          const filtersElement = document.getElementById('search-filters');
          if (filtersElement) {
            const scrollY = window.scrollY;
            const filtersRect = filtersElement.getBoundingClientRect();
            const filtersBottom = filtersRect.bottom + scrollY;
            const isScrolledPastFilters = scrollY > filtersBottom + 100;

            if (!isScrolledPastFilters) {
              setIsVisible(false);
            }
          }
        }
      }
    };

    checkParamsChange();

    if (typeof window !== 'undefined') {
      requestAnimationFrame(() => {
        checkParamsChange();
      });
    }
  }, [searchParams]);

  useEffect(() => {
    let rafId = 0;
    let lastVisible = false;
    let lastShowBack = false;

    const updateState = (visible: boolean, showBack: boolean) => {
      if (visible !== lastVisible || showBack !== lastShowBack) {
        lastVisible = visible;
        lastShowBack = showBack;
        setIsVisible(visible);
        setShowBackButton(showBack);
      }
    };

    const handleScroll = () => {
      if (typeof window === 'undefined') return;

      const filtersElement = document.getElementById('search-filters');
      if (!filtersElement) return;

      filtersElementRef.current = filtersElement;

      const scrollY = window.scrollY;
      const filtersRect = filtersElement.getBoundingClientRect();
      const filtersTop = filtersRect.top + scrollY;
      const filtersBottom = filtersRect.bottom + scrollY;

      const isScrolledPastFilters = scrollY > filtersBottom + 100;
      const isNearFilters = scrollY >= filtersTop - 200 && scrollY <= filtersBottom + 100;

      if (
        scrollY < scrollPositionRef.current - 100 &&
        scrollPositionRef.current > 0 &&
        !hasScrolledToFiltersRef.current
      ) {
        scrollPositionRef.current = 0;
        hasScrolledToFiltersRef.current = false;
      }

      let visible = false;
      let showBack = false;

      if (isScrolledPastFilters) {
        visible = true;
        showBack = hasScrolledToFiltersRef.current && isNearFilters;
      } else if (
        isNearFilters &&
        hasScrolledToFiltersRef.current &&
        scrollPositionRef.current > 0
      ) {
        visible = true;
        showBack = true;
      }

      updateState(visible, showBack);
    };

    const tick = () => {
      handleScroll();
      rafId = 0;
    };

    const onScroll = () => {
      if (rafId === 0) {
        rafId = window.requestAnimationFrame(tick);
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId !== 0) window.cancelAnimationFrame(rafId);
    };
  }, []);

  const scrollToFilters = () => {
    const filtersElement = document.getElementById('search-filters');
    if (!filtersElement) return;

    if (scrollPositionRef.current === 0) {
      scrollPositionRef.current = window.scrollY;
    }

    hasScrolledToFiltersRef.current = true;

    const filtersRect = filtersElement.getBoundingClientRect();
    const offset = 100;
    const targetY = filtersRect.top + window.scrollY - offset;

    window.scrollTo({
      top: targetY,
      behavior: 'smooth',
    });
  };

  const scrollBack = () => {
    if (scrollPositionRef.current > 0) {
      const targetY = scrollPositionRef.current;
      scrollPositionRef.current = 0;
      hasScrolledToFiltersRef.current = false;
      setShowBackButton(false);

      window.scrollTo({
        top: targetY,
        behavior: 'smooth',
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 md:bottom-6 md:right-6">
      <button
        onClick={showBackButton ? scrollBack : scrollToFilters}
        className="group relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg hover-only:hover:shadow-xl transition-all duration-300 transform hover-only:hover:scale-105 active:scale-95 touch-manipulation p-0 m-0"
        style={{
          backgroundColor: '#40916B',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2E6F51';
          e.currentTarget.style.boxShadow =
            '0 15px 20px -5px rgba(0, 0, 0, 0.1), 0 6px 8px -2px rgba(0, 0, 0, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#40916B';
          e.currentTarget.style.boxShadow =
            '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        }}
        aria-label={showBackButton ? t('common.scrollBack') : t('common.scrollToFilters')}
      >
        {showBackButton ? (
          <svg
            className="w-6 h-6 md:w-7 md:h-7 text-white transition-transform group-hover:translate-y-px shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        ) : (
          <svg
            className="w-6 h-6 md:w-7 md:h-7 text-white transition-transform group-hover:translate-y-px shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
            style={{ display: 'block' }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
            />
          </svg>
        )}
        <span className="hidden md:block absolute -top-12 right-0 bg-bg-base text-primary-500 text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-primary-500/20">
          {showBackButton ? t('common.scrollBack') : t('common.scrollToFilters')}
        </span>
      </button>
    </div>
  );
}
