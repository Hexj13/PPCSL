'use client';

const OVERLAY_HISTORY_KEY = 'kupitoOverlay';

type OverlayHistoryState = Record<string, unknown> & {
  [OVERLAY_HISTORY_KEY]?: string;
};

type StackEntry = {
  id: string;
  close: () => void;
};

const stack: StackEntry[] = [];
let popStateListenerAttached = false;
let suppressNextPopState = false;

function handlePopState(): void {
  if (suppressNextPopState) {
    suppressNextPopState = false;
    return;
  }
  const entry = stack.pop();
  entry?.close();
}

function ensurePopStateListener(): void {
  if (popStateListenerAttached || typeof window === 'undefined') {
    return;
  }
  popStateListenerAttached = true;
  window.addEventListener('popstate', handlePopState);
}

export function registerOverlayHistory(id: string, close: () => void): void {
  ensurePopStateListener();
  const top = stack[stack.length - 1];
  if (top?.id === id) {
    top.close = close;
    return;
  }
  stack.push({ id, close });
  const currentState = window.history.state as OverlayHistoryState | null;
  window.history.pushState({ ...(currentState ?? {}), [OVERLAY_HISTORY_KEY]: id }, '');
}

export function detachTopOverlayHistory(): boolean {
  if (stack.length === 0) {
    return false;
  }
  stack.pop();
  return true;
}

export function unregisterOverlayHistory(id: string, closedByUserBack: boolean): void {
  const index = stack.findIndex((entry) => entry.id === id);
  if (index === -1) {
    return;
  }

  const wasTop = index === stack.length - 1;
  stack.splice(index, 1);

  if (closedByUserBack || !wasTop) {
    return;
  }

  const state = window.history.state as OverlayHistoryState | null;
  if (state?.[OVERLAY_HISTORY_KEY] === id) {
    suppressNextPopState = true;
    window.history.back();
  }
}

export function resetOverlayHistoryForTests(): void {
  stack.length = 0;
  suppressNextPopState = false;
}

export function triggerOverlayPopStateForTests(): void {
  handlePopState();
}

export function getOverlayHistoryStackSizeForTests(): number {
  return stack.length;
}
