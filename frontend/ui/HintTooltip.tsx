'use client';

import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePlacement = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceAbove = rect.top;
    const popoverHeight = 80;
    setPlacement(spaceAbove > popoverHeight ? 'top' : 'bottom');
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

  const positionClasses = placement === 'top' ? 'bottom-full mb-2' : 'top-full mt-2';

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
          className="w-4 h-4 text-primary-400 hover:text-primary-300 cursor-pointer transition-colors"
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
          className={`absolute right-0 ${positionClasses} z-[1070] ${width} transition-all duration-150 ease-out ${
            isVisible
              ? 'opacity-100 translate-y-0'
              : placement === 'top'
                ? 'opacity-0 translate-y-1'
                : 'opacity-0 -translate-y-1'
          }`}
        >
          <div className="bg-bg-darker border-2 border-primary-500/50 rounded-lg p-3 shadow-lg relative">
            <div className="text-xs text-text-primary leading-relaxed">{children}</div>
            <div
              className={`absolute right-4 w-0 h-0 border-l-[5px] border-r-[5px] border-transparent ${
                placement === 'top'
                  ? 'top-full border-t-[5px] border-t-primary-500/50'
                  : 'bottom-full border-b-[5px] border-b-primary-500/50'
              }`}
            />
          </div>
        </div>
      )}
    </div>
  );
}
