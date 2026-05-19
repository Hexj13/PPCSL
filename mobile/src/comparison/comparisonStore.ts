import AsyncStorage from '@react-native-async-storage/async-storage';

export const COMPARISON_STORAGE_KEY = 'comparison-storage';
export const MAX_COMPARE = 3;

export type ComparisonStorage = {
  vehicleComparisons: string[];
  tireComparisons: string[];
};

const empty: ComparisonStorage = { vehicleComparisons: [], tireComparisons: [] };

function normalizeIds(ids: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_COMPARE) break;
  }
  return out;
}

async function read(): Promise<ComparisonStorage> {
  try {
    const raw = await AsyncStorage.getItem(COMPARISON_STORAGE_KEY);
    if (!raw) return { ...empty };
    const parsed = JSON.parse(raw) as Partial<ComparisonStorage>;
    return {
      vehicleComparisons: normalizeIds(parsed.vehicleComparisons ?? []),
      tireComparisons: normalizeIds(parsed.tireComparisons ?? []),
    };
  } catch {
    return { ...empty };
  }
}

async function write(data: ComparisonStorage): Promise<void> {
  await AsyncStorage.setItem(COMPARISON_STORAGE_KEY, JSON.stringify(data));
}

export const comparisonStore = {
  read,
  async setVehicle(ids: string[]) {
    const cur = await read();
    await write({ ...cur, vehicleComparisons: normalizeIds(ids) });
  },
  async setTire(ids: string[]) {
    const cur = await read();
    await write({ ...cur, tireComparisons: normalizeIds(ids) });
  },
  async addVehicle(id: string): Promise<boolean> {
    const cur = await read();
    if (cur.vehicleComparisons.includes(id)) return false;
    if (cur.vehicleComparisons.length >= MAX_COMPARE) return false;
    await write({ ...cur, vehicleComparisons: [...cur.vehicleComparisons, id] });
    return true;
  },
  async removeVehicle(id: string) {
    const cur = await read();
    await write({
      ...cur,
      vehicleComparisons: cur.vehicleComparisons.filter((x) => x !== id),
    });
  },
  async addTire(id: string): Promise<boolean> {
    const cur = await read();
    if (cur.tireComparisons.includes(id)) return false;
    if (cur.tireComparisons.length >= MAX_COMPARE) return false;
    await write({ ...cur, tireComparisons: [...cur.tireComparisons, id] });
    return true;
  },
  async removeTire(id: string) {
    const cur = await read();
    await write({
      ...cur,
      tireComparisons: cur.tireComparisons.filter((x) => x !== id),
    });
  },
  async clear() {
    await write({ ...empty });
  },
  count: async () => {
    const cur = await read();
    return cur.vehicleComparisons.length + cur.tireComparisons.length;
  },
};
