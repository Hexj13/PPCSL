'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';

import { INP_TARGET_MS } from '@/lib/performance/inp-kpi';

const CLS_TARGET = 0.1;
const LARGE_SHIFT_TARGET = 0.05;
const REPORT_COOLDOWN_MS = 30000;
const CLS_REPORT_DELAY_MS = 1000;

type ElementAttribution = {
  tag: string;
  id?: string;
  testId?: string;
  role?: string;
  classes?: string[];
};

type VitalsContext = {
  route: string;
  viewport: {
    width: number;
    height: number;
    devicePixelRatio: number;
  };
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
  deviceMemory?: number;
  navigationType?: string;
};

type EventTimingEntry = PerformanceEntry & {
  duration: number;
  processingStart?: number;
  processingEnd?: number;
  interactionId?: number;
  target?: EventTarget | null;
};

type LayoutShiftSource = {
  node?: Node | null;
  previousRect?: DOMRectReadOnly;
  currentRect?: DOMRectReadOnly;
};

type LayoutShiftEntry = PerformanceEntry & {
  value: number;
  hadRecentInput: boolean;
  sources?: LayoutShiftSource[];
};

function shouldSendTelemetry() {
  return process.env.NODE_ENV === 'production' && Boolean(process.env.NEXT_PUBLIC_SENTRY_DSN);
}

function safeAttribute(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, 80);
}

function elementAttribution(
  target: EventTarget | Node | null | undefined,
): ElementAttribution | null {
  if (!(target instanceof Element)) return null;
  const classes = Array.from(target.classList)
    .filter((className) => /^[a-zA-Z0-9_:/!.[\]-]+$/.test(className))
    .slice(0, 6);

  return {
    tag: target.tagName.toLowerCase(),
    id: safeAttribute(target.id),
    testId: safeAttribute(target.getAttribute('data-testid')),
    role: safeAttribute(target.getAttribute('role')),
    classes: classes.length > 0 ? classes : undefined,
  };
}

function getVitalsContext(route: string): VitalsContext {
  const connection = (
    navigator as Navigator & {
      connection?: {
        effectiveType?: string;
        saveData?: boolean;
      };
      deviceMemory?: number;
    }
  ).connection;
  const navigation = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined;

  return {
    route,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio,
    },
    connection: connection
      ? {
          effectiveType: connection.effectiveType,
          saveData: connection.saveData,
        }
      : undefined,
    deviceMemory: (
      navigator as Navigator & {
        deviceMemory?: number;
      }
    ).deviceMemory,
    navigationType: navigation?.type,
  };
}

function interactionTiming(entry: EventTimingEntry) {
  const processingStart = entry.processingStart;
  const processingEnd = entry.processingEnd;
  const inputDelay =
    typeof processingStart === 'number' ? Math.max(0, processingStart - entry.startTime) : null;
  const handlerDuration =
    typeof processingStart === 'number' && typeof processingEnd === 'number'
      ? Math.max(0, processingEnd - processingStart)
      : null;
  const presentationDelay =
    typeof processingEnd === 'number'
      ? Math.max(0, entry.duration - (processingEnd - entry.startTime))
      : null;

  return {
    duration: entry.duration,
    startTime: entry.startTime,
    interactionId: entry.interactionId ?? null,
    processingStart: processingStart ?? null,
    processingEnd: processingEnd ?? null,
    inputDelay,
    handlerDuration,
    presentationDelay,
  };
}

function largestShiftSource(entry: LayoutShiftEntry): LayoutShiftSource | null {
  return entry.sources?.[0] ?? null;
}

async function reportWebVitalsAttribution(
  metric: 'CLS' | 'INP',
  route: string,
  payload: Record<string, unknown>,
) {
  if (!shouldSendTelemetry()) return;
  const Sentry = await import('@sentry/nextjs');
  Sentry.captureMessage('frontend_web_vital_attribution', {
    level: 'info',
    tags: {
      area: 'web-vitals',
      metric,
      route,
    },
    extra: {
      ...payload,
      context: getVitalsContext(route),
    },
  });
}

export function WebVitalsAttributionTelemetry() {
  const pathname = usePathname();
  const routeRef = useRef(pathname);
  const lastReportAtRef = useRef<Record<'CLS' | 'INP', number>>({ CLS: 0, INP: 0 });
  const clsValueRef = useRef(0);
  const largestShiftRef = useRef<{
    value: number;
    startTime: number;
    target: ElementAttribution | null;
  } | null>(null);
  const clsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    routeRef.current = pathname;
    clsValueRef.current = 0;
    largestShiftRef.current = null;
  }, [pathname]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
      return undefined;
    }

    const canReport = (metric: 'CLS' | 'INP') => {
      const now = Date.now();
      if (now - lastReportAtRef.current[metric] < REPORT_COOLDOWN_MS) return false;
      lastReportAtRef.current[metric] = now;
      return true;
    };

    const reportCls = () => {
      clsTimerRef.current = null;
      const largestShift = largestShiftRef.current;
      if (!largestShift) return;
      const cls = clsValueRef.current;
      if (cls < CLS_TARGET && largestShift.value < LARGE_SHIFT_TARGET) return;
      if (!canReport('CLS')) return;

      void reportWebVitalsAttribution('CLS', routeRef.current, {
        value: cls,
        largestShift,
      });
    };

    const clsObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as LayoutShiftEntry;
        if (shift.hadRecentInput || shift.value <= 0) continue;

        clsValueRef.current += shift.value;
        const source = largestShiftSource(shift);
        if (!largestShiftRef.current || shift.value > largestShiftRef.current.value) {
          largestShiftRef.current = {
            value: shift.value,
            startTime: shift.startTime,
            target: elementAttribution(source?.node),
          };
        }
      }

      if (clsTimerRef.current) {
        clearTimeout(clsTimerRef.current);
      }
      clsTimerRef.current = setTimeout(reportCls, CLS_REPORT_DELAY_MS);
    });

    const inpObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const interaction = entry as EventTimingEntry;
        if (!['click', 'keydown', 'pointerdown'].includes(interaction.name)) continue;
        if (interaction.duration < INP_TARGET_MS) continue;
        if (!canReport('INP')) continue;

        void reportWebVitalsAttribution('INP', routeRef.current, {
          eventName: interaction.name,
          timing: interactionTiming(interaction),
          target: elementAttribution(interaction.target),
        });
      }
    });

    try {
      clsObserver.observe({ type: 'layout-shift', buffered: true });
      inpObserver.observe({ type: 'event', buffered: true });
    } catch {
      clsObserver.disconnect();
      inpObserver.disconnect();
      return undefined;
    }

    return () => {
      if (clsTimerRef.current) {
        clearTimeout(clsTimerRef.current);
      }
      clsObserver.disconnect();
      inpObserver.disconnect();
    };
  }, []);

  return null;
}
