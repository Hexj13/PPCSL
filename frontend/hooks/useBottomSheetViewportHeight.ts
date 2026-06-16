'use client';

import { useEffect, useState } from 'react';

function readViewportHeightPx(): number {
  if (typeof window === 'undefined') {
    return 0;
  }
  return window.visualViewport?.height ?? window.innerHeight;
}

export function useBottomSheetViewportHeight(enabled: boolean): number {
  const [heightPx, setHeightPx] = useState(() => (enabled ? readViewportHeightPx() : 0));

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const update = () => {
      setHeightPx(readViewportHeightPx());
    };

    update();
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    window.addEventListener('resize', update);

    return () => {
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [enabled]);

  return heightPx;
}
