import { comparisonApi, listingsApi } from '@/lib/api';
import { localStorageGetItem, localStorageRemoveItem } from '@/lib/browser-local-storage';
import { useComparisonStore } from '@/lib/store';

const MAX_PER_BUCKET = 3;

let comparisonApiLoadBlock: Promise<void> | null = null;
let comparisonApiLoadUnblock: (() => void) | null = null;
let comparisonApiLoadBlockDepth = 0;

let skipNextLoadComparisonFromApiAfterSync = false;

export function holdComparisonApiLoadUntilReleased(): () => void {
  if (comparisonApiLoadBlockDepth === 0) {
    comparisonApiLoadBlock = new Promise<void>((resolve) => {
      comparisonApiLoadUnblock = resolve;
    });
  }
  comparisonApiLoadBlockDepth += 1;
  return () => {
    comparisonApiLoadBlockDepth -= 1;
    if (comparisonApiLoadBlockDepth <= 0) {
      comparisonApiLoadBlockDepth = 0;
      comparisonApiLoadUnblock?.();
      comparisonApiLoadUnblock = null;
      comparisonApiLoadBlock = null;
    }
  };
}

function parsePendingComparisons(): string[] {
  try {
    const raw = localStorageGetItem('pendingComparisons');
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === 'string' && !!id)
      : [];
  } catch {
    return [];
  }
}

export function parseComparisonStorageBuckets(): {
  vehicleListingIds: string[];
  tireListingIds: string[];
} {
  try {
    const raw = localStorageGetItem('comparison-storage');
    if (!raw) return { vehicleListingIds: [], tireListingIds: [] };
    const parsed = JSON.parse(raw) as {
      state?: {
        comparisons?: string[];
        vehicleComparisons?: string[];
        tireComparisons?: string[];
      };
    };
    const state = parsed?.state;
    if (!state) return { vehicleListingIds: [], tireListingIds: [] };

    if (Array.isArray(state.comparisons)) {
      const legacy = state.comparisons.filter((id) => typeof id === 'string' && !!id);
      return { vehicleListingIds: normalizeIds(legacy, MAX_PER_BUCKET), tireListingIds: [] };
    }

    const vehicles = Array.isArray(state.vehicleComparisons)
      ? state.vehicleComparisons.filter((id) => typeof id === 'string' && !!id)
      : [];
    const tires = Array.isArray(state.tireComparisons)
      ? state.tireComparisons.filter((id) => typeof id === 'string' && !!id)
      : [];
    return {
      vehicleListingIds: normalizeIds(vehicles, MAX_PER_BUCKET),
      tireListingIds: normalizeIds(tires, MAX_PER_BUCKET),
    };
  } catch {
    return { vehicleListingIds: [], tireListingIds: [] };
  }
}

function normalizeIds(ids: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

export function mergeIdLists(primary: string[], secondary: string[], max: number): string[] {
  return normalizeIds([...primary, ...secondary], max);
}

async function classifyListingIds(
  ids: string[],
): Promise<{ vehicleListingIds: string[]; tireListingIds: string[] }> {
  const vehicleListingIds: string[] = [];
  const tireListingIds: string[] = [];
  for (const listingId of ids) {
    try {
      const { data } = await listingsApi.getOne(listingId);
      if (data.category === 'tire') {
        if (tireListingIds.length < MAX_PER_BUCKET) tireListingIds.push(listingId);
      } else if (vehicleListingIds.length < MAX_PER_BUCKET) {
        vehicleListingIds.push(listingId);
      }
    } catch {
      void 0;
    }
    if (vehicleListingIds.length >= MAX_PER_BUCKET && tireListingIds.length >= MAX_PER_BUCKET) {
      break;
    }
  }
  return { vehicleListingIds, tireListingIds };
}

export function mergeComparisonSourcesFromLocalStorage(): string[] {
  const pending = parsePendingComparisons();
  const storage = parseComparisonStorageBuckets();
  const flat = [...pending, ...storage.vehicleListingIds, ...storage.tireListingIds];
  return normalizeIds(flat, MAX_PER_BUCKET);
}

export async function loadComparisonFromApi(): Promise<void> {
  const block = comparisonApiLoadBlock;
  if (block) {
    await block;
  }
  if (skipNextLoadComparisonFromApiAfterSync) {
    skipNextLoadComparisonFromApiAfterSync = false;
    return;
  }
  try {
    const { data } = await comparisonApi.getIds();
    useComparisonStore.getState().setVehicleComparisons(data.vehicleListingIds);
    useComparisonStore.getState().setTireComparisons(data.tireListingIds);
  } catch {
    void 0;
  }
}

export async function applyComparisonAfterAuth(): Promise<void> {
  if (typeof window === 'undefined') return;

  const fromStorage = parseComparisonStorageBuckets();
  const pending = parsePendingComparisons();
  localStorageRemoveItem('pendingComparisons');

  let pendingSplit = { vehicleListingIds: [] as string[], tireListingIds: [] as string[] };
  if (pending.length > 0) {
    pendingSplit = await classifyListingIds(pending);
  }

  const guestVehicle = mergeIdLists(
    fromStorage.vehicleListingIds,
    pendingSplit.vehicleListingIds,
    MAX_PER_BUCKET,
  );
  const guestTire = mergeIdLists(
    fromStorage.tireListingIds,
    pendingSplit.tireListingIds,
    MAX_PER_BUCKET,
  );

  if (guestVehicle.length === 0 && guestTire.length === 0) {
    return;
  }

  try {
    const { data } = await comparisonApi.sync({
      vehicleListingIds: guestVehicle,
      tireListingIds: guestTire,
    });
    useComparisonStore.getState().setVehicleComparisons(data.vehicleListingIds);
    useComparisonStore.getState().setTireComparisons(data.tireListingIds);
    skipNextLoadComparisonFromApiAfterSync = true;
  } catch {
    useComparisonStore.getState().setVehicleComparisons(guestVehicle);
    useComparisonStore.getState().setTireComparisons(guestTire);
  }
}
