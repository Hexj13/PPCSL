'use client';

import { useEffect, useState, useRef } from 'react';

export function ScrollToFiltersButton() {
  const [isVisible, setIsVisible] = useState(false);
  const [showBackButton, setShowBackButton] = useState(false);
  const scrollPositionRef = useRef<number>(0);
  const filtersElementRef = useRef<HTMLElement | null>(null);
  const hasScrolledToFiltersRef = useRef<boolean>(false);

  useEffect(() => {
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

      if (isScrolledPastFilters) {
        if (!hasScrolledToFiltersRef.current) {
          setIsVisible(true);
          setShowBackButton(false);
        } else if (isNearFilters) {
          setIsVisible(true);
          setShowBackButton(true);
        } else {
          setIsVisible(true);
          setShowBackButton(false);
        }
      } else if (
        isNearFilters &&
        hasScrolledToFiltersRef.current &&
        scrollPositionRef.current > 0
      ) {
        setIsVisible(true);
        setShowBackButton(true);
      } else if (scrollY < scrollPositionRef.current - 100 && scrollPositionRef.current > 0) {
        scrollPositionRef.current = 0;
        hasScrolledToFiltersRef.current = false;
        setIsVisible(false);
        setShowBackButton(false);
      } else if (!isScrolledPastFilters && scrollPositionRef.current === 0) {
        setIsVisible(false);
        setShowBackButton(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
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
        className="group relative flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95 touch-manipulation p-0 m-0"
        style={{
          backgroundColor: '#31a55f',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#2a8c51';
          e.currentTarget.style.boxShadow =
            '0 15px 20px -5px rgba(0, 0, 0, 0.1), 0 6px 8px -2px rgba(0, 0, 0, 0.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#31a55f';
          e.currentTarget.style.boxShadow =
            '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
        }}
        aria-label={showBackButton ? 'Врати се назад' : 'Скроллирај до филтри'}
      >
        {showBackButton ? (
          <svg
            className="w-6 h-6 md:w-7 md:h-7 text-white transition-transform group-hover:translate-y-[1px] flex-shrink-0"
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
            className="w-6 h-6 md:w-7 md:h-7 text-white transition-transform group-hover:translate-y-[1px] flex-shrink-0"
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
        <span className="hidden md:block absolute -top-12 right-0 bg-bg-dark text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap border border-primary-500/20">
          {showBackButton ? 'Врати се назад' : 'До филтри'}
        </span>
      </button>
    </div>
  );
}
