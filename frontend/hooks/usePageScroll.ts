'use client';

import { useEffect, useRef } from 'react';

import { analytics } from '@/lib/analytics';
import { subscribeWindowScrollFrame } from '@/lib/window-scroll-bus';

const SCROLL_THRESHOLDS = [25, 50, 75, 90] as const;

export function usePageScroll() {
  const trackedThresholdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    const handleScroll = () => {
      if (typeof window === 'undefined') return;

      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollableHeight = documentHeight - windowHeight;

      if (scrollableHeight <= 0) return;

      const percentScrolled = Math.round((scrollTop / scrollableHeight) * 100);

      SCROLL_THRESHOLDS.forEach((threshold) => {
        if (percentScrolled >= threshold && !trackedThresholdsRef.current.has(threshold)) {
          trackedThresholdsRef.current.add(threshold);
          analytics.pageScrollDeferred(threshold);
        }
      });
    };

    return subscribeWindowScrollFrame(handleScroll);
  }, []);
}
