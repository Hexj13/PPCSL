'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

const ITEM_PX = 44;
const VIEW_PX = ITEM_PX * 3;
const PAD_PX = (VIEW_PX - ITEM_PX) / 2;

type LabeledValue = { value: string; label: string };

interface ScrollSnapSinglePickerProps {
  value: string;
  onChange: (_v: string) => void;
  options: LabeledValue[];
  ariaLabel: string;
  emptyOptionLabel?: string;
}

function buildItems(emptyOptionLabel: string | undefined, options: LabeledValue[]): LabeledValue[] {
  const filtered = options.filter((o) => o.value && !String(o.value).startsWith('__'));
  if (emptyOptionLabel) {
    return [{ value: '', label: emptyOptionLabel }, ...filtered];
  }
  return filtered;
}

function indexForValue(items: LabeledValue[], value: string): number {
  const idx = items.findIndex((o) => o.value === value);
  return idx >= 0 ? idx : 0;
}

function scrollTopForIndex(index: number): number {
  return index * ITEM_PX;
}

function indexFromScrollTop(scrollTop: number, maxIdx: number): number {
  const raw = Math.round(scrollTop / ITEM_PX);
  return Math.max(0, Math.min(raw, maxIdx));
}

export function ScrollSnapSinglePicker({
  value,
  onChange,
  options,
  ariaLabel,
  emptyOptionLabel,
}: ScrollSnapSinglePickerProps) {
  const items = useMemo(() => buildItems(emptyOptionLabel, options), [emptyOptionLabel, options]);
  const maxIdx = Math.max(0, items.length - 1);

  const scrollRef = useRef<HTMLDivElement>(null);
  const programmaticRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedIdx = items.length === 0 ? 0 : indexForValue(items, value);
  const [highlightIdx, setHighlightIdx] = useState(selectedIdx);

  const markProgrammaticScroll = useCallback(() => {
    programmaticRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        programmaticRef.current = false;
      });
    });
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || items.length === 0) return;
    const idx = indexForValue(items, value);
    markProgrammaticScroll();
    el.scrollTop = scrollTopForIndex(idx);
    setHighlightIdx(idx);
  }, [value, items, markProgrammaticScroll]);

  const finalizeScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || programmaticRef.current || items.length === 0) return;
    const idx = indexFromScrollTop(el.scrollTop, maxIdx);
    const snappedScrollTop = scrollTopForIndex(idx);
    if (el.scrollTop !== snappedScrollTop) {
      markProgrammaticScroll();
      el.scrollTop = snappedScrollTop;
    }
    setHighlightIdx(idx);
    const next = items[idx].value;
    if (next !== value) {
      onChange(next);
    }
  }, [items, markProgrammaticScroll, maxIdx, onChange, value]);

  const scheduleFinalize = useCallback(() => {
    if (programmaticRef.current) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      finalizeScroll();
    }, 120);
  }, [finalizeScroll]);

  const handleScroll = useCallback(() => {
    if (programmaticRef.current) return;
    const el = scrollRef.current;
    if (el) {
      setHighlightIdx(indexFromScrollTop(el.scrollTop, maxIdx));
    }
    scheduleFinalize();
  }, [maxIdx, scheduleFinalize]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    [],
  );

  const columnShellStyle = { height: VIEW_PX, minHeight: VIEW_PX, maxHeight: VIEW_PX } as const;

  if (items.length === 0) {
    return null;
  }

  const columnShellClass =
    'relative isolate w-full shrink-0 min-w-0 overflow-hidden rounded-xl bg-bg-secondary/35';

  return (
    <div className={columnShellClass} style={columnShellStyle}>
      <div
        className="pointer-events-none absolute inset-x-1.5 top-1/2 z-0 -translate-y-1/2 rounded-lg bg-bg-base/80 ring-1 ring-text-secondary/15"
        style={{ height: ITEM_PX }}
        aria-hidden
      />
      <div
        ref={scrollRef}
        data-bottom-sheet-scrollable="true"
        role="listbox"
        aria-label={ariaLabel}
        className="relative z-[1] h-full max-h-full min-h-0 overflow-y-auto overscroll-y-contain scrollbar-hide snap-y snap-mandatory touch-pan-y"
        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
        onScroll={handleScroll}
        onTouchEnd={handleScroll}
      >
        <div style={{ height: PAD_PX }} aria-hidden />
        {items.map((item, index) => {
          const isCenter = index === highlightIdx;
          return (
            <button
              key={`${item.value}-${index}`}
              type="button"
              role="option"
              aria-selected={isCenter}
              data-testid={`search-wheel-option-${item.value}`}
              className={`flex w-full shrink-0 snap-center items-center justify-center px-2 text-base font-semibold transition-colors ${
                isCenter ? 'text-primary-600' : 'text-text-secondary/50'
              }`}
              style={{ height: ITEM_PX, scrollSnapAlign: 'center' }}
              onClick={() => {
                const el = scrollRef.current;
                if (!el) return;
                markProgrammaticScroll();
                el.scrollTop = scrollTopForIndex(index);
                if (item.value !== value) {
                  onChange(item.value);
                }
                setHighlightIdx(index);
              }}
            >
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
        <div style={{ height: PAD_PX }} aria-hidden />
      </div>
    </div>
  );
}
