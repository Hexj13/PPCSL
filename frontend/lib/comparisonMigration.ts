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
    const parsed = JSON.parse(raw) as {
      state?: {
        comparisons?: string[];
        vehicleComparisons?: string[];
        tireComparisons?: string[];
      };
    };
    const state = parsed?.state;
    if (!state) return [];
    if (Array.isArray(state.comparisons)) {
      return state.comparisons.filter((id) => typeof id === 'string' && !!id);
    }
    const vehicles = Array.isArray(state.vehicleComparisons)
      ? state.vehicleComparisons.filter((id) => typeof id === 'string' && !!id)
      : [];
    const tires = Array.isArray(state.tireComparisons)
      ? state.tireComparisons.filter((id) => typeof id === 'string' && !!id)
      : [];
    return [...vehicles, ...tires];
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

  const valid: { id: string; isTire: boolean }[] = [];
  for (const listingId of candidateIds) {
    try {
      const { data } = await listingsApi.getOne(listingId);
      const isTire = data.category === 'tire';
      valid.push({ id: listingId, isTire });
      if (valid.length >= MAX_COMPARISONS) break;
    } catch {
      // skip invalid or deleted listings
    }
  }

  const { clear, addVehicle, addTire } = useComparisonStore.getState();
  clear();
  for (const { id, isTire } of valid) {
    if (isTire) {
      addTire(id);
    } else {
      addVehicle(id);
    }
  }
}
