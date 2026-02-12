import { useEffect, useRef, useState } from 'react';

interface UseLoadingStateOptions {
  isLoading: boolean;
  showDelay?: number;
  minDisplayTime?: number;
  immediate?: boolean;
}

interface UseLoadingStateReturn {
  visible: boolean;
  // eslint-disable-next-line no-unused-vars
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
  const loadingStartTimeRef = useRef<number | null>(null);
  const isMountedRef = useRef(true);
  const pendingCallbacksRef = useRef<Array<() => void>>([]);

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

  useEffect(() => {
    if (isLoading) {
      if (minDisplayTimeoutRef.current) {
        clearTimeout(minDisplayTimeoutRef.current);
        minDisplayTimeoutRef.current = null;
      }
      if (loadingStartTimeRef.current === null) {
        loadingStartTimeRef.current = Date.now();

        if (immediate) {
          if (isMountedRef.current) {
            setVisible(true);
          }
        } else {
          delayTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setVisible(true);
            }
          }, showDelay);
        }
      }
    } else {
      if (delayTimeoutRef.current) {
        clearTimeout(delayTimeoutRef.current);
        delayTimeoutRef.current = null;
      }

      if (visible && loadingStartTimeRef.current !== null) {
        const elapsedTime = Date.now() - loadingStartTimeRef.current;
        const remainingTime = minDisplayTime - elapsedTime;

        if (remainingTime > 0) {
          minDisplayTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              setVisible(false);
              loadingStartTimeRef.current = null;

              const callbacks = [...pendingCallbacksRef.current];
              pendingCallbacksRef.current = [];
              callbacks.forEach((callback) => {
                try {
                  callback();
                } catch (error) {
                  console.error('Error in afterHidden callback:', error);
                }
              });
            }
          }, remainingTime);
        } else {
          if (isMountedRef.current) {
            setVisible(false);
            loadingStartTimeRef.current = null;

            const callbacks = [...pendingCallbacksRef.current];
            pendingCallbacksRef.current = [];
            callbacks.forEach((callback) => {
              try {
                callback();
              } catch (error) {
                console.error('Error in afterHidden callback:', error);
              }
            });
          }
        }
      } else {
        if (isMountedRef.current) {
          setVisible(false);
          loadingStartTimeRef.current = null;
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
    if (!visible && loadingStartTimeRef.current === null) {
      callback();
    } else {
      pendingCallbacksRef.current.push(callback);
    }
  };

  return { visible, afterHidden };
}
