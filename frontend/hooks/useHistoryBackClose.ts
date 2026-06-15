'use client';

import { useCallback, useEffect, useRef } from 'react';

import { registerOverlayHistory, unregisterOverlayHistory } from '@/lib/overlay-history';

export function useHistoryBackClose(
  isOpen: boolean,
  onClose: () => void,
  overlayId: string,
): { dismissOverlay: () => void } {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closedByPopRef = useRef(false);
  const dismissedProgrammaticallyRef = useRef(false);

  const dismissOverlay = useCallback(() => {
    dismissedProgrammaticallyRef.current = true;
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    closedByPopRef.current = false;
    dismissedProgrammaticallyRef.current = false;

    const closeFromHistory = () => {
      closedByPopRef.current = true;
      onCloseRef.current();
    };

    registerOverlayHistory(overlayId, closeFromHistory);

    return () => {
      unregisterOverlayHistory(
        overlayId,
        closedByPopRef.current || dismissedProgrammaticallyRef.current,
      );
      closedByPopRef.current = false;
      dismissedProgrammaticallyRef.current = false;
    };
  }, [isOpen, overlayId]);

  return { dismissOverlay };
}
