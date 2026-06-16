import type { RefObject } from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { addCoalescedResizeListener } from '@/lib/resize-coalesced';

export function useTabIndicator<T extends string>(
  activeTab: T,
  tabRefs: Record<T, RefObject<HTMLButtonElement | null>>,
  containerRef: RefObject<HTMLDivElement | null>,
  measureKey?: string | number,
) {
  const indicatorRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const tabRefsRef = useRef(tabRefs);
  tabRefsRef.current = tabRefs;
  const lastIndicatorStyleRef = useRef({ left: 0, width: 0 });

  const updateIndicatorRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const run = () => {
      const activeRef = tabRefsRef.current[activeTab];
      if (activeRef?.current && containerRef?.current) {
        const left = activeRef.current.offsetLeft;
        const width = activeRef.current.offsetWidth;

        if (
          lastIndicatorStyleRef.current.left !== left ||
          lastIndicatorStyleRef.current.width !== width
        ) {
          lastIndicatorStyleRef.current = { left, width };
          setIndicatorStyle({ left, width });
        }
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
    let removeResizeListener: (() => void) | null = null;
    if (container) {
      onUpdate = () => updateIndicatorRef.current();
      resizeObserver = new ResizeObserver(onUpdate);
      resizeObserver.observe(container);
      removeResizeListener = addCoalescedResizeListener(onUpdate);
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
          removeResizeListener?.();
          container.removeEventListener('scroll', onUpdate);
        }
      }
    };
  }, [activeTab, containerRef, measureKey]);

  return { indicatorRef, indicatorStyle };
}
