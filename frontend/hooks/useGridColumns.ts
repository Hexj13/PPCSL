'use client';

import { useEffect, useState } from 'react';

const COLUMN_BREAKPOINTS = [
  { query: '(min-width: 1280px)', columns: 4 },
  { query: '(min-width: 1024px)', columns: 3 },
  { query: '(min-width: 768px)', columns: 2 },
] as const;

export function resolveGridColumns(): number {
  if (typeof window === 'undefined') {
    return 1;
  }
  for (const { query, columns } of COLUMN_BREAKPOINTS) {
    if (window.matchMedia(query).matches) {
      return columns;
    }
  }
  return 1;
}

export function useGridColumns(): number {
  const [columns, setColumns] = useState(1);

  useEffect(() => {
    const mediaQueries = COLUMN_BREAKPOINTS.map(({ query }) => window.matchMedia(query));

    const updateColumns = () => {
      setColumns(resolveGridColumns());
    };

    updateColumns();

    const cleanups = mediaQueries.map((mediaQuery) => {
      mediaQuery.addEventListener('change', updateColumns);
      return () => mediaQuery.removeEventListener('change', updateColumns);
    });

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, []);

  return columns;
}
