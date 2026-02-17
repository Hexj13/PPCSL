import type { RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

export function useTabIndicator<T extends string>(
  activeTab: T,
  tabRefs: Record<T, RefObject<HTMLButtonElement | null>>,
  containerRef: RefObject<HTMLDivElement | null>,
) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefsRef = useRef(tabRefs);
  tabRefsRef.current = tabRefs;

  const updateIndicatorRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const run = () => {
      const activeRef = tabRefsRef.current[activeTab];
      if (activeRef?.current && containerRef?.current) {
        const rect = activeRef.current.getBoundingClientRect();
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const scrollLeft = container.scrollLeft ?? 0;
        setIndicatorStyle({
          left: rect.left - containerRect.left + scrollLeft,
          width: rect.width,
        });
      }
    };
    updateIndicatorRef.current = run;
    run();
    const rafId1 = requestAnimationFrame(() => {
      requestAnimationFrame(run);
    });
    const container = containerRef.current;
    const timeoutIds: number[] = [];
    let resizeObserver: ResizeObserver | null = null;
    let onUpdate: (() => void) | null = null;
    if (container) {
      onUpdate = () => updateIndicatorRef.current();
      resizeObserver = new ResizeObserver(onUpdate);
      resizeObserver.observe(container);
      window.addEventListener('resize', onUpdate);
      container.addEventListener('scroll', onUpdate, { passive: true });
      timeoutIds.push(window.setTimeout(run, 150));
    } else {
      timeoutIds.push(window.setTimeout(run, 0));
      timeoutIds.push(window.setTimeout(run, 100));
      timeoutIds.push(window.setTimeout(run, 300));
    }
    return () => {
      cancelAnimationFrame(rafId1);
      timeoutIds.forEach((id) => clearTimeout(id));
      if (resizeObserver && container) {
        resizeObserver.disconnect();
        if (onUpdate) {
          window.removeEventListener('resize', onUpdate);
          container.removeEventListener('scroll', onUpdate);
        }
      }
    };
  }, [activeTab, containerRef]);

  return { indicatorRef, indicatorStyle };
}
