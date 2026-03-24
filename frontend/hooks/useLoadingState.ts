import { useEffect, useRef, useState } from 'react';

interface UseLoadingStateOptions {
  isLoading: boolean;
  showDelay?: number;
  minDisplayTime?: number;
  immediate?: boolean;
}

interface UseLoadingStateReturn {
  visible: boolean;

  afterHidden: (callback: () => void) => void;
}

const DEFAULT_SHOW_DELAY = 200;
const DEFAULT_MIN_DISPLAY_TIME = 1000;

export function useLoadingState({
  isLoading,
  showDelay = DEFAULT_SHOW_DELAY,
  minDisplayTime = DEFAULT_MIN_DISPLAY_TIME,
  immediate = false,
}: UseLoadingStateOptions): UseLoadingStateReturn {
  const [visible, setVisible] = useState(immediate && isLoading);
  const delayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minDisplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibilityStartRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const isLoadingRef = useRef(isLoading);
  const pendingCallbacksRef = useRef<Array<() => void>>([]);

  isLoadingRef.current = isLoading;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
      if (minDisplayTimeoutRef.current) {
        clearTimeout(minDisplayTimeoutRef.current);
      }
    };
  }, []);

  const runPendingCallbacks = () => {
    const callbacks = [...pendingCallbacksRef.current];
    pendingCallbacksRef.current = [];
    callbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        console.error('Error in afterHidden callback:', error);
      }
    });
  };

  useEffect(() => {
    if (isLoading) {
      if (minDisplayTimeoutRef.current) {
        clearTimeout(minDisplayTimeoutRef.current);
        minDisplayTimeoutRef.current = null;
      }
      if (visible && visibilityStartRef.current === null) {
        visibilityStartRef.current = Date.now();
      }
      if (!visible) {
        if (immediate) {
          visibilityStartRef.current = Date.now();
          if (isMountedRef.current) {
            setVisible(true);
          }
        } else if (!delayTimeoutRef.current) {
          delayTimeoutRef.current = setTimeout(() => {
            delayTimeoutRef.current = null;
            if (!isMountedRef.current || !isLoadingRef.current) {
              return;
            }
            visibilityStartRef.current = Date.now();
            setVisible(true);
          }, showDelay);
        }
      }
    } else {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }

      if (!visible) {
        visibilityStartRef.current = null;
        return;
      }

      const start = visibilityStartRef.current;
      if (start === null) {
        if (isMountedRef.current) {
          setVisible(false);
        }
        return;
      }

      const elapsedTime = Date.now() - start;
      const remainingTime = minDisplayTime - elapsedTime;

      if (remainingTime > 0) {
        minDisplayTimeoutRef.current = setTimeout(() => {
          minDisplayTimeoutRef.current = null;
          if (isMountedRef.current) {
            setVisible(false);
            visibilityStartRef.current = null;
            runPendingCallbacks();
          }
        }, remainingTime);
      } else {
        if (isMountedRef.current) {
          setVisible(false);
          visibilityStartRef.current = null;
          runPendingCallbacks();
        }
      }
    }

    return () => {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
      }
      if (minDisplayTimeoutRef.current) {
        clearTimeout(minDisplayTimeoutRef.current);
      }
    };
  }, [isLoading, showDelay, minDisplayTime, immediate, visible]);

  const afterHidden = (callback: () => void) => {
    if (!visible && visibilityStartRef.current === null) {
      callback();
    } else {
      pendingCallbacksRef.current.push(callback);
    }
  };

  return { visible, afterHidden };
}
