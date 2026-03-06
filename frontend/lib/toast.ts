import hotToast, { type Renderable, type ToastOptions } from 'react-hot-toast';

const REMOVE_DELAY = 1000;
const DEDUPE_CLEAR_MS = {
  success: 2000 + REMOVE_DELAY,
  error: 4000 + REMOVE_DELAY,
  blank: 4000 + REMOVE_DELAY,
};
const DEFAULT_DURATION_MS = {
  success: 2000,
  error: 4000,
  blank: 4000,
};

type DedupeType = 'success' | 'error' | 'blank';

interface DedupeEntry {
  id: string;
  count: number;
  timeoutId: ReturnType<typeof setTimeout>;
}

const dedupeMap = new Map<string, DedupeEntry>();

function makeKey(type: DedupeType, message: string): string {
  return `${type}:${message}`;
}

function clearEntry(key: string): void {
  const entry = dedupeMap.get(key);
  if (entry) {
    clearTimeout(entry.timeoutId);
    dedupeMap.delete(key);
  }
}

function displayWithCount(message: string, count: number): string {
  return count > 1 ? `${message} (${count})` : message;
}

function createDedupedHandler(type: DedupeType) {
  const duration = DEFAULT_DURATION_MS[type];
  const clearAfter = DEDUPE_CLEAR_MS[type];

  const invoke =
    type === 'blank'
      ? (msg: Renderable, opts?: ToastOptions) => hotToast(msg, opts)
      : (msg: Renderable, opts?: ToastOptions) => hotToast[type](msg, opts);

  return (message: Renderable, options?: ToastOptions): string => {
    const messageStr = typeof message === 'string' ? message : undefined;
    if (messageStr === undefined) {
      return invoke(message, options);
    }

    const key = makeKey(type, messageStr);
    const existing = dedupeMap.get(key);

    if (existing) {
      clearTimeout(existing.timeoutId);
      const newCount = existing.count + 1;
      const displayMessage = displayWithCount(messageStr, newCount);
      invoke(displayMessage, {
        ...options,
        id: existing.id,
        duration: options?.duration ?? duration,
      });
      const timeoutId = setTimeout(() => clearEntry(key), clearAfter);
      dedupeMap.set(key, { id: existing.id, count: newCount, timeoutId });
      return existing.id;
    }

    const id = invoke(messageStr, { ...options, duration: options?.duration ?? duration });
    const timeoutId = setTimeout(() => clearEntry(key), clearAfter);
    dedupeMap.set(key, { id, count: 1, timeoutId });
    return id;
  };
}

const toastFn = (message: Renderable, options?: ToastOptions): string => {
  if (typeof message === 'string') {
    return createDedupedHandler('blank')(message, options);
  }
  return hotToast(message, options);
};

toastFn.success = createDedupedHandler('success');
toastFn.error = createDedupedHandler('error');
toastFn.loading = hotToast.loading;
toastFn.custom = hotToast.custom;
toastFn.promise = hotToast.promise;
toastFn.dismiss = hotToast.dismiss;
toastFn.dismissAll = hotToast.dismissAll;
toastFn.remove = hotToast.remove;
toastFn.removeAll = hotToast.removeAll;

export const toast = toastFn;
export { Toaster } from 'react-hot-toast';
