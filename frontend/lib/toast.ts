import { createElement, type ReactElement } from 'react';
import hotToast, { type Renderable, type ToastOptions } from 'react-hot-toast';

import { loadThemeSync } from '@/lib/theme';

const TOAST_ICON_PX = 24;

const CHECK_SQUARE_PATH =
  'M12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22ZM16.0303 8.96967C16.3232 9.26256 16.3232 9.73744 16.0303 10.0303L11.0303 15.0303C10.7374 15.3232 10.2626 15.3232 9.96967 15.0303L7.96967 13.0303C7.67678 12.7374 7.67678 12.2626 7.96967 11.9697C8.26256 11.6768 8.73744 11.6768 9.03033 11.9697L10.5 13.4393L14.9697 8.96967C15.2626 8.67678 15.7374 8.67678 16.0303 8.96967Z';

const CLOSE_SQUARE_PATH =
  'M12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22ZM8.96965 8.96967C9.26254 8.67678 9.73742 8.67678 10.0303 8.96967L12 10.9394L13.9696 8.96969C14.2625 8.6768 14.7374 8.6768 15.0303 8.96969C15.3232 9.26258 15.3232 9.73746 15.0303 10.0303L13.0606 12L15.0303 13.9697C15.3232 14.2625 15.3232 14.7374 15.0303 15.0303C14.7374 15.3232 14.2625 15.3232 13.9696 15.0303L12 13.0607L10.0303 15.0303C9.73744 15.3232 9.26256 15.3232 8.96967 15.0303C8.67678 14.7374 8.67678 14.2626 8.96967 13.9697L10.9393 12L8.96965 10.0303C8.67676 9.73744 8.67676 9.26256 8.96965 8.96967Z';

const DANGER_SQUARE_PATH =
  'M12 2C7.28595 2 4.92893 2 3.46447 3.46447C2 4.92893 2 7.28595 2 12C2 16.714 2 19.0711 3.46447 20.5355C4.92893 22 7.28595 22 12 22C16.714 22 19.0711 22 20.5355 20.5355C22 19.0711 22 16.714 22 12C22 7.28595 22 4.92893 20.5355 3.46447C19.0711 2 16.714 2 12 2ZM12 6.25C12.4142 6.25 12.75 6.58579 12.75 7V13C12.75 13.4142 12.4142 13.75 12 13.75C11.5858 13.75 11.25 13.4142 11.25 13V7C11.25 6.58579 11.5858 6.25 12 6.25ZM12 17C12.5523 17 13 16.5523 13 16C13 15.4477 12.5523 15 12 15C11.4477 15 11 15.4477 11 16C11 16.5523 11.4477 17 12 17Z';

const semantic = loadThemeSync('md').semantic;

function wrapToastIcon(inner: ReactElement, color: string): ReactElement {
  return createElement(
    'div',
    {
      className: 'toast-icon-slot',
      style: {
        position: 'relative',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minWidth: TOAST_ICON_PX,
        minHeight: TOAST_ICON_PX,
        width: TOAST_ICON_PX,
        height: TOAST_ICON_PX,
        flexShrink: 0,
        color,
      },
    },
    inner,
  );
}

function toastSquareSvg(pathD: string): ReactElement {
  return createElement(
    'svg',
    {
      width: TOAST_ICON_PX,
      height: TOAST_ICON_PX,
      viewBox: '0 0 24 24',
      fill: 'none',
      xmlns: 'http://www.w3.org/2000/svg',
      'aria-hidden': true,
    },
    createElement('path', {
      fillRule: 'evenodd',
      clipRule: 'evenodd',
      d: pathD,
      fill: 'currentColor',
    }),
  );
}

const TOAST_SUCCESS_ICON = wrapToastIcon(toastSquareSvg(CHECK_SQUARE_PATH), semantic.success);
const TOAST_WARNING_ICON = wrapToastIcon(toastSquareSvg(DANGER_SQUARE_PATH), semantic.warning);
const TOAST_ERROR_ICON = wrapToastIcon(toastSquareSvg(CLOSE_SQUARE_PATH), semantic.error);

const REMOVE_DELAY = 1000;
const DEDUPE_CLEAR_MS = {
  success: 2000 + REMOVE_DELAY,
  error: 4000 + REMOVE_DELAY,
  warning: 4000 + REMOVE_DELAY,
  blank: 4000 + REMOVE_DELAY,
};
const DEFAULT_DURATION_MS = {
  success: 2000,
  error: 4000,
  warning: 4000,
  blank: 4000,
};

const WARNING_TOAST_STYLE: NonNullable<ToastOptions['style']> = {
  background: '#FFFFFF',
  color: '#1B1B1B',
  border: '2px solid rgba(255, 193, 7, 0.65)',
  borderRadius: '0.75rem',
  padding: '16px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)',
  whiteSpace: 'pre-line',
};

type DedupeType = 'success' | 'error' | 'warning' | 'blank';

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

  const invoke = (msg: Renderable, opts?: ToastOptions) => {
    if (type === 'blank') return hotToast(msg, opts);
    if (type === 'warning') {
      return hotToast(msg, {
        ...opts,
        icon: opts?.icon !== undefined ? opts.icon : TOAST_WARNING_ICON,
        style: { ...WARNING_TOAST_STYLE, ...opts?.style },
        duration: opts?.duration ?? duration,
      });
    }
    if (type === 'error') {
      return hotToast.error(msg, {
        ...opts,
        icon: opts?.icon !== undefined ? opts.icon : TOAST_ERROR_ICON,
      });
    }
    return hotToast.success(msg, {
      ...opts,
      icon: opts?.icon !== undefined ? opts.icon : TOAST_SUCCESS_ICON,
    });
  };

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
toastFn.warning = createDedupedHandler('warning');
toastFn.loading = hotToast.loading;
toastFn.custom = hotToast.custom;
toastFn.promise = hotToast.promise;
toastFn.dismiss = hotToast.dismiss;
toastFn.dismissAll = hotToast.dismissAll;
toastFn.remove = hotToast.remove;
toastFn.removeAll = hotToast.removeAll;

export const toast = toastFn;
export { Toaster } from 'react-hot-toast';
