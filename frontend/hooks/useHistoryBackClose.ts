'use client';

import { useEffect, useRef } from 'react';

import { registerOverlayHistory, unregisterOverlayHistory } from '@/lib/overlay-history';

export function useHistoryBackClose(isOpen: boolean, onClose: () => void, overlayId: string): void {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const closedByPopRef = useRef(false);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    closedByPopRef.current = false;

    const closeFromHistory = () => {
      closedByPopRef.current = true;
      onCloseRef.current();
    };

    registerOverlayHistory(overlayId, closeFromHistory);

    return () => {
      unregisterOverlayHistory(overlayId, closedByPopRef.current);
      closedByPopRef.current = false;
    };
  }, [isOpen, overlayId]);
}
