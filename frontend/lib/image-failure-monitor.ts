'use client';

type ImageFailureEvent = {
  scope: 'listing_card' | 'listing_page' | 'listing_modal';
  listingId?: string;
  imageUrl: string;
  imageIndex: number;
  imagesTotal: number;
};

const EVENT_TTL_MS = 2 * 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 30;
const WINDOW_MS = 10 * 60 * 1000;
const diagnosticsTimestamps: number[] = [];
const reportedEvents = new Map<string, number>();
const diagnosticsCheckedUrls = new Set<string>();

function now(): number {
  return Date.now();
}

function cleanupTimestamps() {
  const threshold = now() - WINDOW_MS;
  while (diagnosticsTimestamps.length > 0 && diagnosticsTimestamps[0] < threshold) {
    diagnosticsTimestamps.shift();
  }
}

function canSendDiagnostics(): boolean {
  cleanupTimestamps();
  if (diagnosticsTimestamps.length >= MAX_EVENTS_PER_WINDOW) {
    return false;
  }
  diagnosticsTimestamps.push(now());
  return true;
}

function getConnectionMeta() {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  };
  return {
    effectiveType: nav.connection?.effectiveType ?? null,
    downlink: nav.connection?.downlink ?? null,
    rtt: nav.connection?.rtt ?? null,
    saveData: nav.connection?.saveData ?? null,
    online: navigator.onLine,
  };
}

async function fetchImageStatus(imageUrl: string): Promise<number | null> {
  if (diagnosticsCheckedUrls.has(imageUrl)) {
    return null;
  }
  diagnosticsCheckedUrls.add(imageUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const response = await fetch(imageUrl, {
      method: 'HEAD',
      cache: 'no-store',
      mode: 'cors',
      signal: controller.signal,
    });
    return response.status;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function reportImageLoadFailure(event: ImageFailureEvent): Promise<void> {
  if (typeof window === 'undefined') return;
  if (!event.imageUrl || event.imageUrl === '/placeholder-car.jpg') return;

  const key = `${event.scope}:${event.listingId ?? 'unknown'}:${event.imageIndex}:${event.imageUrl}`;
  const lastReportedAt = reportedEvents.get(key);
  if (lastReportedAt && now() - lastReportedAt < EVENT_TTL_MS) {
    return;
  }
  if (!canSendDiagnostics()) {
    return;
  }
  reportedEvents.set(key, now());

  const connection = getConnectionMeta();
  const imageStatus = await fetchImageStatus(event.imageUrl);

  const Sentry = await import('@sentry/nextjs');
  Sentry.captureMessage('image_load_failed', {
    level: 'warning',
    tags: {
      area: event.scope,
      imageFailure: true,
      imageStatus: imageStatus ? String(imageStatus) : 'unknown',
    },
    extra: {
      listingId: event.listingId ?? null,
      imageUrl: event.imageUrl,
      imageIndex: event.imageIndex,
      imagesTotal: event.imagesTotal,
      pathname: window.location.pathname,
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      connection,
      imageStatus,
      timestamp: new Date().toISOString(),
    },
  });
}
