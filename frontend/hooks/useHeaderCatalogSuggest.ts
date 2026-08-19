'use client';

import axios from 'axios';
import { useEffect, useState } from 'react';

import { brandsApi } from '@/lib/api';
import {
  HEADER_CATALOG_SUGGEST_DEBOUNCE_MS,
  HEADER_CATALOG_SUGGEST_MAX_CHARS,
  hasMinHeaderSuggestChars,
  type CatalogSuggestItem,
} from '@/lib/search/header-catalog-suggest.types';

export function useHeaderCatalogSuggest(query: string): {
  items: CatalogSuggestItem[];
  isLoading: boolean;
} {
  const [items, setItems] = useState<CatalogSuggestItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      !hasMinHeaderSuggestChars(query) ||
      query.trim().length > HEADER_CATALOG_SUGGEST_MAX_CHARS
    ) {
      setItems([]);
      setIsLoading(false);
      return undefined;
    }

    setItems([]);
    setIsLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void brandsApi
        .suggest(query.trim(), { signal: controller.signal })
        .then((response) => {
          if (!controller.signal.aborted) {
            setItems(response.data.items);
          }
        })
        .catch((error: unknown) => {
          if (
            axios.isCancel(error) ||
            (axios.isAxiosError(error) && error.code === 'ERR_CANCELED')
          ) {
            return;
          }
          if (axios.isAxiosError(error) && error.response?.status === 429) {
            return;
          }
          if (!controller.signal.aborted) {
            setItems([]);
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setIsLoading(false);
          }
        });
    }, HEADER_CATALOG_SUGGEST_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { items, isLoading };
}
