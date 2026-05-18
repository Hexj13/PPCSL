import { blurhashToDataURL } from '@/lib/utils/blurhash';

const DECODED_CACHE_MAX = 500;
const decodedCache = new Map<string, string | undefined>();
const pendingHashById = new Map<number, string>();

function rememberDecoded(hash: string, value: string | undefined) {
  if (decodedCache.size >= DECODED_CACHE_MAX) {
    decodedCache.clear();
  }
  decodedCache.set(hash, value);
}

function syncDecode(hash: string): string | undefined {
  try {
    return blurhashToDataURL(hash);
  } catch {
    return undefined;
  }
}

let worker: Worker | null = null;
let nextId = 1;
const pending = new Map<number, (value: string | undefined) => void>();

function attachWorkerHandlers(w: Worker) {
  w.onmessage = (event: MessageEvent<{ id: number; dataUrl?: string }>) => {
    const { id, dataUrl } = event.data;
    const hash = pendingHashById.get(id);
    pendingHashById.delete(id);
    if (hash != null) {
      rememberDecoded(hash, dataUrl);
    }
    const resolve = pending.get(id);
    pending.delete(id);
    resolve?.(dataUrl);
  };
  const flushPending = () => {
    pending.forEach((resolve) => {
      resolve(undefined);
    });
    pending.clear();
    pendingHashById.clear();
  };
  w.onmessageerror = flushPending;
  w.onerror = flushPending;
}

function getWorker(): Worker | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (worker) return worker;
  try {
    const w = new Worker(new URL('./blurhash-worker.ts', import.meta.url), { type: 'module' });
    attachWorkerHandlers(w);
    worker = w;
    return w;
  } catch {
    return null;
  }
}

export function getDecodedBlurhashFromCache(hash: string): string | undefined {
  if (typeof hash !== 'string' || hash.length < 6) {
    return undefined;
  }
  return decodedCache.has(hash) ? decodedCache.get(hash) : undefined;
}

export function decodeBlurhashOffMain(hash: string): Promise<string | undefined> {
  if (typeof hash !== 'string' || hash.length < 6) {
    return Promise.resolve(undefined);
  }
  if (decodedCache.has(hash)) {
    return Promise.resolve(decodedCache.get(hash));
  }
  const w = getWorker();
  if (!w) {
    const v = syncDecode(hash);
    rememberDecoded(hash, v);
    return Promise.resolve(v);
  }
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    pendingHashById.set(id, hash);
    try {
      w.postMessage({ id, hash });
    } catch {
      pending.delete(id);
      pendingHashById.delete(id);
      const v = syncDecode(hash);
      rememberDecoded(hash, v);
      resolve(v);
    }
  });
}
