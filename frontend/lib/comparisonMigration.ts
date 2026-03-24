import { listingsApi } from '@/lib/api';
import { useComparisonStore } from '@/lib/store';

const MAX_COMPARISONS = 3;

function parsePendingComparisons(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('pendingComparisons');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string' && !!id)
      : [];
  } catch {
    return [];
  }
}

function parseComparisonStorageIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('comparison-storage');
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { state?: { comparisons?: string[] } };
    const list = parsed?.state?.comparisons;
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string' && !!id) : [];
  } catch {
    return [];
  }
}

export function mergeComparisonSourcesFromLocalStorage(): string[] {
  const pending = parsePendingComparisons();
  const fromStorage = parseComparisonStorageIds();
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const id of [...pending, ...fromStorage]) {
    if (seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
    if (ordered.length >= MAX_COMPARISONS) break;
  }
  return ordered;
}

export async function applyComparisonAfterAuth(): Promise<void> {
  if (typeof window === 'undefined') return;

  const candidateIds = mergeComparisonSourcesFromLocalStorage();
  localStorage.removeItem('pendingComparisons');

  if (candidateIds.length === 0) {
    return;
  }

  const valid: string[] = [];
  for (const listingId of candidateIds) {
    try {
      await listingsApi.getOne(listingId);
      valid.push(listingId);
      if (valid.length >= MAX_COMPARISONS) break;
    } catch {
      // skip invalid or deleted listings
    }
  }

  const { clear, add } = useComparisonStore.getState();
  clear();
  for (const id of valid) {
    add(id);
  }
}
