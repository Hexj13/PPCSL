export const LISTING_SORTS = {
  created_at_DESC: {
    sortBy: 'created_at',
    sortOrder: 'DESC' as const,
    label: 'Најнови прво',
  },
  created_at_ASC: {
    sortBy: 'created_at',
    sortOrder: 'ASC' as const,
    label: 'Најстари прво',
  },
  views_DESC: {
    sortBy: 'views',
    sortOrder: 'DESC' as const,
    label: 'Популарно',
  },
  price_ASC: {
    sortBy: 'price',
    sortOrder: 'ASC' as const,
    label: 'Цена растечки',
  },
  price_DESC: {
    sortBy: 'price',
    sortOrder: 'DESC' as const,
    label: 'Цена опаѓачки',
  },
  year_DESC: {
    sortBy: 'year',
    sortOrder: 'DESC' as const,
    label: 'Година опаѓачки',
  },
  year_ASC: {
    sortBy: 'year',
    sortOrder: 'ASC' as const,
    label: 'Година растечки',
  },
} as const;

export type ListingSortKey = keyof typeof LISTING_SORTS;

export const DEFAULT_LISTING_SORT_KEY: ListingSortKey = 'created_at_DESC';

export const isListingSortKey = (value: string): value is ListingSortKey => value in LISTING_SORTS;

export const resolveListingSortKey = (
  sortByParam: string | null,
  sortOrderParam: string | null
): ListingSortKey => {
  if (sortByParam && sortOrderParam) {
    const candidate = `${sortByParam}_${sortOrderParam}`;
    if (isListingSortKey(candidate)) {
      return candidate;
    }
  }
  return DEFAULT_LISTING_SORT_KEY;
};

export const LISTING_SORT_OPTIONS = (Object.keys(LISTING_SORTS) as ListingSortKey[]).map((key) => ({
  value: key,
  label: LISTING_SORTS[key].label,
}));
