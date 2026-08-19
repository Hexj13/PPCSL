import { localStorageSetItem } from '@/lib/browser-local-storage';
import { sessionStorageGetItem, sessionStorageSetItem } from '@/lib/browser-session-storage';

export type CrossTabEvent =
  | {
      type: 'favorites-changed';
      listingId: string;
      action: 'add' | 'remove';
      isAuthenticated: boolean;
      at: number;
    }
  | {
      type: 'comparison-changed';
      listingId: string;
      action: 'add' | 'remove';
      bucket?: 'vehicle' | 'tire';
      isAuthenticated: boolean;
      at: number;
    }
  | {
      type: 'listing-status-changed';
      listingId: string;
      status: 'Active' | 'Paused' | 'Closed';
      at: number;
    };

type CrossTabWire = CrossTabEvent & { sourceTabId: string };

const CHANNEL_NAME = 'ppcsl-cross-tab';
const STORAGE_SIGNAL_KEY = 'ppcsl-cross-tab-signal';

function getTabId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = sessionStorageGetItem('ppcsl_cross_tab_id');
    if (!id) {
      id = crypto.randomUUID();
      sessionStorageSetItem('ppcsl_cross_tab_id', id);
    }
    return id;
  } catch {
    return 'fallback';
  }
}

let channel: BroadcastChannel | null = null;

function getChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined') return null;
  try {
    channel ??= new BroadcastChannel(CHANNEL_NAME);
    return channel;
  } catch {
    return null;
  }
}

function isCrossTabWire(data: unknown): data is CrossTabWire {
  if (!data || typeof data !== 'object') return false;
  const o = data as Record<string, unknown>;
  return (
    typeof o.type === 'string' && typeof o.sourceTabId === 'string' && typeof o.at === 'number'
  );
}

function toEvent(wire: CrossTabWire): CrossTabEvent {
  const { sourceTabId: _s, ...rest } = wire;
  return rest as CrossTabEvent;
}

export function publishCrossTabEvent(event: CrossTabEvent): void {
  if (typeof window === 'undefined') return;
  const sourceTabId = getTabId();
  const wire: CrossTabWire = { ...event, sourceTabId };
  const ch = getChannel();
  if (ch) {
    try {
      ch.postMessage(wire);
    } catch {
      void 0;
    }
  }
  try {
    localStorageSetItem(STORAGE_SIGNAL_KEY, JSON.stringify(wire));
  } catch {
    void 0;
  }
}

export function subscribeToCrossTabEvents(handler: (event: CrossTabEvent) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const tabId = getTabId();
  const dispatch = (wire: CrossTabWire) => {
    if (wire.sourceTabId === tabId) return;
    handler(toEvent(wire));
  };
  const ch = getChannel();
  const onMessage = (e: MessageEvent) => {
    if (isCrossTabWire(e.data)) {
      dispatch(e.data);
    }
  };
  if (ch) {
    ch.addEventListener('message', onMessage);
  }
  const onStorage = (e: StorageEvent) => {
    if (e.key !== STORAGE_SIGNAL_KEY || !e.newValue) return;
    try {
      const parsed = JSON.parse(e.newValue) as unknown;
      if (isCrossTabWire(parsed)) {
        dispatch(parsed);
      }
    } catch {
      void 0;
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    if (ch) {
      ch.removeEventListener('message', onMessage);
    }
    window.removeEventListener('storage', onStorage);
  };
}
