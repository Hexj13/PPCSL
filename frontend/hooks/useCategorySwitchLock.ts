import { useCallback, useRef, useState } from 'react';

const CATEGORY_SWITCH_ANIMATION_MS = 300;

export function useCategorySwitchLock() {
  const [isCategorySwitching, setIsCategorySwitching] = useState(false);
  const lockRef = useRef(false);
  const unlockTimeoutRef = useRef<number | null>(null);

  const scheduleUnlock = useCallback(() => {
    if (unlockTimeoutRef.current !== null) {
      window.clearTimeout(unlockTimeoutRef.current);
    }
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        unlockTimeoutRef.current = window.setTimeout(() => {
          lockRef.current = false;
          setIsCategorySwitching(false);
          unlockTimeoutRef.current = null;
        }, CATEGORY_SWITCH_ANIMATION_MS);
      });
    });
  }, []);

  const withCategorySwitchLock = useCallback(
    (action: () => void) => {
      if (lockRef.current) return;
      lockRef.current = true;
      setIsCategorySwitching(true);
      action();
      scheduleUnlock();
    },
    [scheduleUnlock],
  );

  return { isCategorySwitching, withCategorySwitchLock };
}
