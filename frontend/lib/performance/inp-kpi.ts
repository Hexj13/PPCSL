export const INP_TARGET_MS = 200;
export const LONG_TASK_THRESHOLD_MS = 16;
export const INTERACTION_HANDLER_TARGET_MS = 16;

export const BASELINE_SCENARIOS = [
  'filter_submit_search',
  'quick_filter_apply',
  'sort_dropdown_change',
  'listing_card_click',
  'scroll_filters_zone',
] as const;

export type BaselineScenario = (typeof BASELINE_SCENARIOS)[number];

export function isGoodInp(durationMs: number): boolean {
  return durationMs < INP_TARGET_MS;
}

export function isLongTask(durationMs: number): boolean {
  return durationMs >= LONG_TASK_THRESHOLD_MS;
}

export function startInpAttributionObserver(
  onEntry?: (entry: {
    name: string;
    duration: number;
    startTime: number;
    processingStart?: number;
    processingEnd?: number;
  }) => void,
): () => void {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') {
    return () => {};
  }
  const eventTypes = ['click', 'keydown', 'pointerdown'];
  let cancelled = false;
  try {
    const observer = new PerformanceObserver((list) => {
      if (cancelled) return;
      for (const entry of list.getEntries()) {
        const e = entry as PerformanceEntry & {
          duration: number;
          processingStart?: number;
          processingEnd?: number;
        };
        if (e.duration > 0 && eventTypes.includes(e.name)) {
          onEntry?.({
            name: e.name,
            duration: e.duration,
            startTime: e.startTime,
            processingStart: e.processingStart,
            processingEnd: e.processingEnd,
          });
        }
      }
    });
    observer.observe({ type: 'event', buffered: true });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  } catch {
    return () => {};
  }
}
