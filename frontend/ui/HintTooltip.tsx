'use client';

import type { ReactNode } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface HintTooltipProps {
  children?: ReactNode;
  contentHtml?: string;
  ariaLabel?: string;
  width?: string;
  className?: string;
}

const VIEWPORT_MARGIN = 8;
const GAP = 8;

export function HintTooltip({
  children,
  contentHtml,
  ariaLabel,
  width = 'w-64',
  className = '',
}: HintTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [placement, setPlacement] = useState<'top' | 'bottom'>('top');
  const [_horizontalPlacement, setHorizontalPlacement] = useState<'left' | 'right'>('right');
  const [portalStyle, setPortalStyle] = useState<{
    top: number;
    left: number;
    placement: 'top' | 'bottom';
    horizontalPlacement: 'left' | 'right';
  } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updatePortalPosition = useCallback(() => {
    const trigger = containerRef.current;
    const pop = popoverRef.current;
    if (!trigger || !pop || !isOpen) return;

    const rect = trigger.getBoundingClientRect();
    const popW = pop.offsetWidth;
    const popH = pop.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceAbove = rect.top;
    const spaceBelow = vh - rect.bottom;
    const neededAbove = popH + GAP;
    const neededBelow = popH + GAP;
    const fitsAbove = spaceAbove >= neededAbove + VIEWPORT_MARGIN;
    const fitsBelow = spaceBelow >= neededBelow + VIEWPORT_MARGIN;
    let nextPlacement: 'top' | 'bottom';
    if (fitsAbove && fitsBelow) {
      nextPlacement = spaceAbove >= spaceBelow ? 'top' : 'bottom';
    } else if (fitsBelow) {
      nextPlacement = 'bottom';
    } else if (fitsAbove) {
      nextPlacement = 'top';
    } else {
      nextPlacement = spaceAbove >= spaceBelow ? 'top' : 'bottom';
    }

    const spaceRight = vw - rect.left - VIEWPORT_MARGIN;
    const spaceLeft = rect.left - VIEWPORT_MARGIN;
    let nextHorizontal: 'left' | 'right';
    if (spaceRight >= popW) {
      nextHorizontal = 'right';
    } else if (spaceLeft >= popW) {
      nextHorizontal = 'left';
    } else {
      nextHorizontal = spaceRight >= spaceLeft ? 'right' : 'left';
    }
    let left: number;
    if (nextHorizontal === 'right') {
      left = rect.left;
    } else {
      left = rect.right - popW;
    }
    left = Math.max(VIEWPORT_MARGIN, Math.min(left, vw - popW - VIEWPORT_MARGIN));

    let top: number;
    if (nextPlacement === 'top') {
      top = rect.top - popH - GAP;
      top = Math.max(VIEWPORT_MARGIN, top);
    } else {
      top = rect.bottom + GAP;
      top = Math.min(top, vh - VIEWPORT_MARGIN - popH);
    }

    setPlacement(nextPlacement);
    setHorizontalPlacement(nextHorizontal);
    setPortalStyle({
      top,
      left,
      placement: nextPlacement,
      horizontalPlacement: nextHorizontal,
    });
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) {
      setPortalStyle(null);
      return;
    }
    updatePortalPosition();
    window.addEventListener('resize', updatePortalPosition);
    const pop = popoverRef.current;
    const ro =
      pop &&
      new ResizeObserver(() => {
        updatePortalPosition();
      });
    if (pop && ro) {
      ro.observe(pop);
    }
    return () => {
      window.removeEventListener('resize', updatePortalPosition);
      ro?.disconnect();
    };
  }, [isOpen, children, contentHtml, width, updatePortalPosition]);

  const open = useCallback(() => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setIsOpen(true);
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

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
      const target = e.target as Node;
      const inTrigger = containerRef.current?.contains(target);
      const inPopover = popoverRef.current?.contains(target);
      if (!inTrigger && !inPopover) {
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

  const positioned = portalStyle !== null;
  const animPlacement = portalStyle?.placement ?? placement;

  const popoverContent = isOpen && typeof document !== 'undefined' && (
    <div
      ref={popoverRef}
      className={`fixed z-[10010] ${width} transition-[opacity,transform] duration-150 ease-out`}
      style={{
        left: portalStyle?.left ?? 0,
        top: portalStyle?.top ?? 0,
        maxWidth: 'calc(100vw - 16px)',
        visibility: positioned ? 'visible' : 'hidden',
        pointerEvents: positioned ? 'auto' : 'none',
        ...(positioned && isVisible
          ? { opacity: 1, transform: 'translateY(0)' }
          : animPlacement === 'top'
            ? { opacity: 0, transform: 'translateY(4px)' }
            : { opacity: 0, transform: 'translateY(-4px)' }),
      }}
    >
      <div className="bg-bg-base border-2 border-primary-900 rounded-lg p-3 shadow-lg">
        {contentHtml !== undefined ? (
          <div
            className="text-xs text-primary-900 leading-relaxed [&_strong]:font-bold"
            dangerouslySetInnerHTML={{ __html: contentHtml }}
          />
        ) : (
          <div className="text-xs text-primary-900 leading-relaxed">{children}</div>
        )}
      </div>
    </div>
  );

  return (
    <>
      <div ref={containerRef} className={`relative inline-flex ${className}`}>
        <button
          type="button"
          onClick={toggle}
          className="focus:outline-hidden p-0.5 -m-0.5 rounded-sm"
          aria-expanded={isOpen}
          aria-label={ariaLabel}
        >
          <svg
            className="w-4 h-4 text-primary-500 hover-only:hover:text-primary-700 cursor-pointer transition-colors"
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
      </div>
      {popoverContent && createPortal(popoverContent, document.body)}
    </>
  );
}
