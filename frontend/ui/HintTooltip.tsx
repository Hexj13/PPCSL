'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface HintTooltipProps {
  children: ReactNode;
  ariaLabel?: string;
  width?: string;
  className?: string;
}

export function HintTooltip({
  children,
  ariaLabel,
  width = 'w-64',
  className = '',
}: HintTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [horizontalPlacement, setHorizontalPlacement] = useState<'left' | 'right'>('right');
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const POPOVER_WIDTH = 288;
  const POPOVER_HEIGHT = 80;

  const updatePlacement = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const spaceLeft = rect.left;
    setPlacement(spaceAbove > POPOVER_HEIGHT ? 'top' : 'bottom');
    setHorizontalPlacement(spaceLeft < POPOVER_WIDTH ? 'right' : 'left');
  }, []);

  const open = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    updatePlacement();
    setIsOpen(true);
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, [updatePlacement]);

  const close = useCallback(() => {
    setIsVisible(false);
    closeTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      closeTimeoutRef.current = null;
    }, 150);
  }, []);

  const toggle = useCallback(() => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  }, [isOpen, open, close]);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };

    const handleScroll = () => {
      close();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        close();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, close]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const verticalClasses = placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';
  const horizontalClasses = horizontalPlacement === 'left' ? 'right-0' : 'left-0';
  const arrowClasses =
    placement === 'top'
      ? 'top-full border-t-[5px] border-t-primary-900'
      : 'bottom-full border-b-[5px] border-b-primary-900';
  const arrowHorizontalClasses = horizontalPlacement === 'left' ? 'right-4' : 'left-4';

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        type="button"
        onClick={toggle}
        className="focus:outline-none p-0.5 -m-0.5 rounded"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
      >
        <svg
          className="w-4 h-4 text-primary-500 hover:text-primary-700 cursor-pointer transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>
      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute ${horizontalClasses} ${verticalClasses} z-[1070] ${width} transition-all duration-150 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : placement === 'top'
                ? 'opacity-0 translate-y-1'
                : 'opacity-0 -translate-y-1'
          }`}
        >
          <div className="bg-bg-base border-2 border-primary-900 rounded-lg p-3 shadow-lg relative">
            <div className="text-xs text-primary-900 leading-relaxed">{children}</div>
            <div
              className={`absolute ${arrowHorizontalClasses} w-0 h-0 border-l-[5px] border-r-[5px] border-transparent ${arrowClasses}`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
