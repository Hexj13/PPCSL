'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import { useTranslation } from '@/hooks/useTranslation';

const ITEM_PX = 44;
const VIEW_PX = ITEM_PX * 3;
const PAD_PX = (VIEW_PX - ITEM_PX) / 2;

type LabeledValue = { value: string; label: string };

interface ScrollSnapDualPickerProps {
  fromLabel: string;
  toLabel: string;
  fromValue: string;
  toValue: string;
  onFromChange: (_v: string) => void;
  onToChange: (_v: string) => void;
  options: LabeledValue[];
  emptyOptionLabel: string;
  showColumnLabels?: boolean;
}

function buildItems(emptyOptionLabel: string, options: LabeledValue[]): LabeledValue[] {
  return [{ value: '', label: emptyOptionLabel }, ...options];
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

export function ScrollSnapDualPicker({
  fromLabel,
  toLabel,
  fromValue,
  toValue,
  onFromChange,
  onToChange,
  options,
  emptyOptionLabel,
  showColumnLabels = true,
}: ScrollSnapDualPickerProps) {
  const { t } = useTranslation();
  const rangeDash = t('common.rangeDash');
  const items = useMemo(() => buildItems(emptyOptionLabel, options), [emptyOptionLabel, options]);
  const maxIdx = items.length - 1;

  const fromScrollRef = useRef<HTMLDivElement>(null);
  const toScrollRef = useRef<HTMLDivElement>(null);
  const programmaticFromRef = useRef(false);
  const programmaticToRef = useRef(false);
  const fromDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fromSelectedIdx = indexForValue(items, fromValue);
  const toSelectedIdx = indexForValue(items, toValue);

  const [fromHighlightIdx, setFromHighlightIdx] = useState(fromSelectedIdx);
  const [toHighlightIdx, setToHighlightIdx] = useState(toSelectedIdx);

  const markFromProgrammaticScroll = useCallback(() => {
    programmaticFromRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        programmaticFromRef.current = false;
      });
    });
  }, []);

  const markToProgrammaticScroll = useCallback(() => {
    programmaticToRef.current = true;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        programmaticToRef.current = false;
      });
    });
  }, []);

  useLayoutEffect(() => {
    const el = fromScrollRef.current;
    if (!el) return;
    const idx = indexForValue(items, fromValue);
    markFromProgrammaticScroll();
    el.scrollTop = scrollTopForIndex(idx);
    setFromHighlightIdx(idx);
  }, [fromValue, items, markFromProgrammaticScroll]);

  useLayoutEffect(() => {
    const el = toScrollRef.current;
    if (!el) return;
    const idx = indexForValue(items, toValue);
    markToProgrammaticScroll();
    el.scrollTop = scrollTopForIndex(idx);
    setToHighlightIdx(idx);
  }, [toValue, items, markToProgrammaticScroll]);

  const finalizeFromScroll = useCallback(() => {
    const el = fromScrollRef.current;
    if (!el || programmaticFromRef.current) return;
    const idx = indexFromScrollTop(el.scrollTop, maxIdx);
    const snappedScrollTop = scrollTopForIndex(idx);
    if (el.scrollTop !== snappedScrollTop) {
      markFromProgrammaticScroll();
      el.scrollTop = snappedScrollTop;
    }
    setFromHighlightIdx(idx);
    const next = items[idx].value;
    if (next !== fromValue) {
      onFromChange(next);
    }
  }, [fromValue, items, markFromProgrammaticScroll, maxIdx, onFromChange]);

  const finalizeToScroll = useCallback(() => {
    const el = toScrollRef.current;
    if (!el || programmaticToRef.current) return;
    const idx = indexFromScrollTop(el.scrollTop, maxIdx);
    const snappedScrollTop = scrollTopForIndex(idx);
    if (el.scrollTop !== snappedScrollTop) {
      markToProgrammaticScroll();
      el.scrollTop = snappedScrollTop;
    }
    setToHighlightIdx(idx);
    const next = items[idx].value;
    if (next !== toValue) {
      onToChange(next);
    }
  }, [items, markToProgrammaticScroll, maxIdx, onToChange, toValue]);

  const scheduleFromFinalize = useCallback(() => {
    if (programmaticFromRef.current) return;
    if (fromDebounceRef.current) clearTimeout(fromDebounceRef.current);
    fromDebounceRef.current = setTimeout(() => {
      fromDebounceRef.current = null;
      finalizeFromScroll();
    }, 120);
  }, [finalizeFromScroll]);

  const scheduleToFinalize = useCallback(() => {
    if (programmaticToRef.current) return;
    if (toDebounceRef.current) clearTimeout(toDebounceRef.current);
    toDebounceRef.current = setTimeout(() => {
      toDebounceRef.current = null;
      finalizeToScroll();
    }, 120);
  }, [finalizeToScroll]);

  const handleFromScroll = useCallback(() => {
    if (programmaticFromRef.current) return;
    const el = fromScrollRef.current;
    if (el) {
      setFromHighlightIdx(indexFromScrollTop(el.scrollTop, maxIdx));
    }
    scheduleFromFinalize();
  }, [maxIdx, scheduleFromFinalize]);

  const handleToScroll = useCallback(() => {
    if (programmaticToRef.current) return;
    const el = toScrollRef.current;
    if (el) {
      setToHighlightIdx(indexFromScrollTop(el.scrollTop, maxIdx));
    }
    scheduleToFinalize();
  }, [maxIdx, scheduleToFinalize]);

  useEffect(
    () => () => {
      if (fromDebounceRef.current) clearTimeout(fromDebounceRef.current);
      if (toDebounceRef.current) clearTimeout(toDebounceRef.current);
    },
    [],
  );

  const columnShellStyle = { height: VIEW_PX, minHeight: VIEW_PX, maxHeight: VIEW_PX } as const;

  const columnShellClass =
    'relative isolate w-full shrink-0 min-w-0 overflow-hidden rounded-xl bg-bg-secondary/35';

  const renderWheel = (
    heading: string,
    scrollRef: React.RefObject<HTMLDivElement | null>,
    highlightIdx: number,
    onScroll: () => void,
    markProgrammaticScroll: () => void,
    onPick: (_item: LabeledValue, index: number) => void,
  ) => (
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
        aria-label={heading}
        className="relative z-[1] h-full max-h-full min-h-0 overflow-y-auto overscroll-y-contain scrollbar-hide snap-y snap-mandatory touch-pan-y"
        style={{ scrollSnapType: 'y mandatory', WebkitOverflowScrolling: 'touch' }}
        onScroll={onScroll}
        onTouchEnd={onScroll}
      >
        <div style={{ height: PAD_PX }} aria-hidden />
        {items.map((item, index) => {
          const isCenter = index === highlightIdx;
          return (
            <button
              key={`${heading}-${item.value}-${index}`}
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
                onPick(item, index);
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

  return (
    <div
      className={`flex w-full shrink-0 flex-col px-4 pb-2 ${showColumnLabels ? 'gap-y-1' : 'gap-y-0'}`}
    >
      {showColumnLabels ? (
        <div className="flex flex-row items-center gap-x-2">
          <span className="min-w-0 flex-1 text-center text-xs font-semibold text-primary-700">
            {fromLabel}
          </span>
          <span className="min-w-[1.25rem] shrink-0" aria-hidden />
          <span className="min-w-0 flex-1 text-center text-xs font-semibold text-primary-700">
            {toLabel}
          </span>
        </div>
      ) : null}
      <div className="flex flex-row items-center gap-x-2">
        <div className="min-h-0 min-w-0 flex-1 basis-0">
          {renderWheel(
            fromLabel,
            fromScrollRef,
            fromHighlightIdx,
            handleFromScroll,
            markFromProgrammaticScroll,
            (item) => {
              if (item.value !== fromValue) onFromChange(item.value);
            },
          )}
        </div>
        <span className="shrink-0 select-none self-center text-center text-base font-semibold text-primary-700">
          {rangeDash}
        </span>
        <div className="min-h-0 min-w-0 flex-1 basis-0">
          {renderWheel(
            toLabel,
            toScrollRef,
            toHighlightIdx,
            handleToScroll,
            markToProgrammaticScroll,
            (item) => {
              if (item.value !== toValue) onToChange(item.value);
            },
          )}
        </div>
      </div>
    </div>
  );
}
