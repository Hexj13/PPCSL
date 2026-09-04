'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';

import { BottomSheet } from '@/components/common/BottomSheet';
import { HeaderCatalogSuggestList } from '@/components/layout/Header/HeaderCatalogSuggestList';
import { CloseIcon, SearchIcon } from '@/components/layout/Header/icons';
import { useHeaderCatalogSuggest } from '@/hooks/useHeaderCatalogSuggest';
import { useLocalizedNavigation } from '@/hooks/useLocalizedNavigation';
import { useTranslation } from '@/hooks/useTranslation';
import { sessionStorageSetItem } from '@/lib/browser-session-storage';
import { clearHomeScrollRestoreSession } from '@/lib/home-scroll-restore';
import { detachTopOverlayHistory } from '@/lib/overlay-history';
import { buildHeaderSuggestPath } from '@/lib/search/apply-header-suggest';
import {
  hasMinHeaderSuggestChars,
  type CatalogSuggestItem,
} from '@/lib/search/header-catalog-suggest.types';
import { stripLocalePrefixFromPathname } from '@/lib/url-locale';

import {
  HEADER_CATALOG_SEARCH_MIN_WIDTH_PX,
  HEADER_DESKTOP_MIN_WIDTH_PX,
} from './headerBreakpoints';

export const HEADER_CATALOG_SEARCH_SHEET_INPUT_ID = 'header-catalog-search-sheet-input';

function currentVehicleTypeFromSearch(search: string): 'car' | 'truck' | 'moto' | undefined {
  const value = new URLSearchParams(search).get('vehicleType');
  if (value === 'truck' || value === 'moto' || value === 'car') {
    return value;
  }
  return undefined;
}

export function HeaderCatalogSearch({
  variant,
  mobileOpen = false,
  onMobileOpenChange,
  onDesktopActiveChange,
}: {
  variant: 'desktop' | 'mobile';
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
  onDesktopActiveChange?: (active: boolean) => void;
}) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { push, replace } = useLocalizedNavigation();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();
  const { items, isLoading } = useHeaderCatalogSuggest(query);
  const canShowPanel = hasMinHeaderSuggestChars(query);
  const currentYear = String(new Date().getFullYear());
  const activeOptionId =
    canShowPanel && items.length > 0 ? `header-catalog-search-option-${activeIndex}` : undefined;

  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  useLayoutEffect(() => {
    if (variant !== 'mobile') {
      return;
    }
    if (mobileOpen) {
      inputRef.current?.focus({ preventScroll: true });
      return;
    }
    setQuery('');
  }, [mobileOpen, variant]);

  useEffect(() => {
    if (variant !== 'desktop' || !isOpen) {
      return undefined;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        onDesktopActiveChange?.(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [isOpen, onDesktopActiveChange, variant]);

  useEffect(() => {
    if (variant !== 'mobile' || !mobileOpen) {
      return undefined;
    }
    const mq = window.matchMedia(`(min-width: ${HEADER_DESKTOP_MIN_WIDTH_PX}px)`);
    const closeOnDesktop = () => {
      if (mq.matches) {
        onMobileOpenChange?.(false);
      }
    };
    closeOnDesktop();
    mq.addEventListener('change', closeOnDesktop);
    return () => mq.removeEventListener('change', closeOnDesktop);
  }, [mobileOpen, onMobileOpenChange, variant]);

  const applyItem = useCallback(
    (item: CatalogSuggestItem) => {
      const path = buildHeaderSuggestPath(item, {
        currentYear,
        currentVehicleType: currentVehicleTypeFromSearch(searchParams.toString()),
      });
      sessionStorageSetItem('scrollToResultsAfterLoad', 'header');
      clearHomeScrollRestoreSession();
      const hadOverlay = detachTopOverlayHistory();
      const { restPath } = stripLocalePrefixFromPathname(pathname ?? '/');
      if (hadOverlay || restPath === '/') {
        replace(path, { scroll: false });
      } else {
        push(path);
      }
      setIsOpen(false);
      setQuery('');
      onDesktopActiveChange?.(false);
      onMobileOpenChange?.(false);
    },
    [currentYear, onDesktopActiveChange, onMobileOpenChange, pathname, push, replace, searchParams],
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      setIsOpen(false);
      onDesktopActiveChange?.(false);
      onMobileOpenChange?.(false);
      inputRef.current?.blur();
      return;
    }
    if (!canShowPanel || items.length === 0) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => (index + 1) % items.length);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => (index - 1 + items.length) % items.length);
      return;
    }
    if (event.key === 'Enter' && items[activeIndex]) {
      event.preventDefault();
      applyItem(items[activeIndex]);
    }
  };

  const isSheet = variant === 'mobile';
  const input = (
    <div className={`relative flex min-w-0 flex-1 items-center ${isSheet ? 'h-12' : 'h-10'}`}>
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary-700" />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={query}
        id={isSheet ? HEADER_CATALOG_SEARCH_SHEET_INPUT_ID : undefined}
        data-testid="header-catalog-search-input"
        aria-label={t('header.catalogSearch')}
        aria-autocomplete="list"
        aria-expanded={canShowPanel && (variant === 'mobile' || isOpen)}
        aria-controls={listId}
        aria-activedescendant={activeOptionId}
        aria-haspopup="listbox"
        placeholder={t('header.catalogSearchPlaceholder')}
        className={`input-field search-control-border w-full [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:appearance-none ${
          isSheet ? 'header-catalog-search-sheet-input' : 'header-catalog-search-input min-w-0'
        }`}
        onChange={(event) => {
          setQuery(event.target.value);
          setIsOpen(true);
          onDesktopActiveChange?.(true);
        }}
        onFocus={() => {
          setIsOpen(true);
          onDesktopActiveChange?.(true);
        }}
        onKeyDown={onKeyDown}
      />
      {query.length > 0 && (
        <button
          type="button"
          data-testid="header-catalog-search-clear"
          className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center text-primary-700"
          aria-label={t('header.catalogSearchClear')}
          onClick={() => {
            setQuery('');
            inputRef.current?.focus();
          }}
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const results =
    canShowPanel && (variant === 'desktop' ? isOpen : true) ? (
      <HeaderCatalogSuggestList
        items={items}
        isLoading={isLoading}
        activeIndex={activeIndex}
        listId={listId}
        onHover={setActiveIndex}
        onSelect={applyItem}
      />
    ) : null;

  if (variant === 'mobile') {
    return (
      <BottomSheet
        isOpen={mobileOpen}
        onClose={() => onMobileOpenChange?.(false)}
        title={t('header.catalogSearch')}
        lockSheetHeight
        mobileOnly={false}
        dataTestId="header-catalog-search-sheet"
        header={
          <div className="flex shrink-0 items-center gap-2 border-b border-primary-500/20 px-3 pb-3">
            {input}
            <span className="h-6 w-px shrink-0 bg-primary-700/30" aria-hidden />
            <button
              type="button"
              data-testid="header-catalog-search-cancel"
              className="shrink-0 px-2 text-sm font-medium text-primary-700"
              onClick={() => onMobileOpenChange?.(false)}
            >
              {t('common.cancel')}
            </button>
          </div>
        }
      >
        <div data-bottom-sheet-scrollable="true" className="min-h-0 flex-1 overflow-y-auto">
          {results}
        </div>
      </BottomSheet>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      {input}
      {results && (
        <div
          className="absolute left-0 top-full z-50 mt-2 w-full overflow-hidden rounded-xl bg-bg-base shadow-lg search-control-border"
          style={{ minWidth: HEADER_CATALOG_SEARCH_MIN_WIDTH_PX }}
          data-testid="header-catalog-search-dropdown"
        >
          {results}
        </div>
      )}
    </div>
  );
}
