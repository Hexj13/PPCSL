export const LISTING_SORTS = {
  created_at_DESC: {
    sortBy: 'created_at',
    sortOrder: 'DESC' as const,
    translationKey: 'common.sorting.newestFirst',
  },
  created_at_ASC: {
    sortBy: 'created_at',
    sortOrder: 'ASC' as const,
    translationKey: 'common.sorting.oldestFirst',
  },
  views_DESC: {
    sortBy: 'views',
    sortOrder: 'DESC' as const,
    translationKey: 'common.sorting.popular',
  },
  price_ASC: {
    sortBy: 'price',
    sortOrder: 'ASC' as const,
    translationKey: 'common.sorting.priceAscending',
  },
  price_DESC: {
    sortBy: 'price',
    sortOrder: 'DESC' as const,
    translationKey: 'common.sorting.priceDescending',
  },
  year_DESC: {
    sortBy: 'year',
    sortOrder: 'DESC' as const,
    translationKey: 'common.sorting.yearDescending',
  },
  year_ASC: {
    sortBy: 'year',
    sortOrder: 'ASC' as const,
    translationKey: 'common.sorting.yearAscending',
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

export const getListingSortOptions = (t: (_key: string) => string) => {
  return (Object.keys(LISTING_SORTS) as ListingSortKey[]).map((sortKey) => ({
    value: sortKey,
    label: t(LISTING_SORTS[sortKey].translationKey),
  }));
};
