export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export function parsePageQuery(value: string | undefined, defaultValue = 1): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return defaultValue;
  }
  return Math.max(1, parsed);
}

export function parseLimitQuery(
  value: string | undefined,
  options: { defaultValue: number; maxValue: number },
): number {
  const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(parsed)) {
    return options.defaultValue;
  }
  return Math.min(options.maxValue, Math.max(1, parsed));
}

export function buildPaginationMeta(total: number, page: number, limit: number): PaginationMeta {
  return {
    total,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(total / limit)),
  };
}
