'use client';

import { isAxiosError } from 'axios';

import { api } from '@/lib/api/api-client';
import { getImageInflightCount } from '@/lib/image-inflight-tracker';
import { getNavigationCount } from '@/lib/navigation-count';

type ImageFailureEvent = {
  scope: 'listing_card' | 'listing_page' | 'listing_modal';
  listingId?: string;
  imageUrl: string;
  imageIndex: number;
  imagesTotal: number;
  attemptsMade?: number;
};

const EVENT_TTL_MS = 2 * 60 * 1000;
const MAX_EVENTS_PER_WINDOW = 30;
const WINDOW_MS = 10 * 60 * 1000;
const diagnosticsTimestamps: number[] = [];
const reportedEvents = new Map<string, number>();

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

function classifyImageUrlKind(imageUrl: string): 'origin' | 'optimized' | 'unknown' {
  try {
    const u = new URL(imageUrl, 'https://example.test');
    if (u.pathname.includes('/api/upload/image/')) return 'optimized';
    if (u.pathname.startsWith('/uploads/')) return 'origin';
    return 'unknown';
  } catch {
    return 'unknown';
  }
}

function imageHostFromUrl(imageUrl: string): string {
  try {
    return new URL(imageUrl, 'https://example.test').hostname;
  } catch {
    return 'unknown';
  }
}

type DiagnosticsHeadResult = {
  status: number | null;
  reason?: 'timeout' | 'network' | 'invalid_host' | 'rate_limited';
};

async function fetchImageStatusViaApi(imageUrl: string): Promise<DiagnosticsHeadResult> {
  try {
    const { data } = await api.get<DiagnosticsHeadResult>('/api/diagnostics/image-status', {
      params: { url: imageUrl },
      timeout: 3500,
    });
    return {
      status: typeof data?.status === 'number' ? data.status : null,
      reason: data?.reason,
    };
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 429) {
      return { status: null, reason: 'rate_limited' };
    }
    return { status: null, reason: 'network' };
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
  const head = await fetchImageStatusViaApi(event.imageUrl);
  const imageStatusTag =
    typeof head.status === 'number' && Number.isFinite(head.status)
      ? String(head.status)
      : 'unknown';
  const imageUrlKind = classifyImageUrlKind(event.imageUrl);
  const imageHost = imageHostFromUrl(event.imageUrl);

  const Sentry = await import('@sentry/nextjs');
  Sentry.captureMessage('image_load_failed', {
    level: 'warning',
    tags: {
      area: event.scope,
      imageFailure: true,
      imageStatus: imageStatusTag,
      retriesExhausted: 'true',
      imageUrlKind,
      imageHost,
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
      imageStatus: head.status,
      diagnosticsReason: head.reason ?? null,
      inflightImages: getImageInflightCount(),
      navigationCount: getNavigationCount(),
      attemptsMade: event.attemptsMade ?? null,
      timestamp: new Date().toISOString(),
    },
  });
}
