import { useEffect, useRef } from 'react';

export function useRefreshWhenVisible(isVisible: boolean, refresh: () => void): void {
  const wasHiddenRef = useRef(false);
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!isVisible) {
      wasHiddenRef.current = true;
      return;
    }
    if (!wasHiddenRef.current) {
      return;
    }
    wasHiddenRef.current = false;
    refreshRef.current();
  }, [isVisible]);
}
