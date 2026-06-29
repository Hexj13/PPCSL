import { useEffect, useState } from 'react';

import { snapModalImageWidthToLadder } from './listing-page-image-modal-urls';

type ModalViewportSettings = {
  targetImageWidth: number;
  imageQuality: number;
  isMobileViewport: boolean;
};

type NetworkConnection = {
  effectiveType?: string;
  saveData?: boolean;
};

export function computeModalViewportSettings(): ModalViewportSettings {
  if (typeof window === 'undefined') {
    return { targetImageWidth: 1200, imageQuality: 75, isMobileViewport: true };
  }

  const viewportWidth = window.innerWidth;
  const isMobile = viewportWidth <= 768;
  const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
  const hasSlowNetwork =
    connection?.saveData === true ||
    ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '');
  const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 2.2 : 3);
  const widthMultiplier = isMobile ? 1 : 1.2;
  const minWidth = 1200;
  const maxWidth = isMobile ? (hasSlowNetwork ? 1200 : 1440) : 1920;
  const quality = isMobile ? (hasSlowNetwork ? 68 : 75) : 85;
  const computedTargetWidth = Math.min(
    maxWidth,
    Math.max(minWidth, Math.round(viewportWidth * pixelRatio * widthMultiplier)),
  );
  const normalizedTargetWidth = snapModalImageWidthToLadder(computedTargetWidth);

  return {
    targetImageWidth: normalizedTargetWidth,
    imageQuality: quality,
    isMobileViewport: isMobile,
  };
}

const RESIZE_DEBOUNCE_MS = 150;

type UseListingPageImageModalViewportParams = {
  isOpen: boolean;
};

export function useListingPageImageModalViewport({
  isOpen,
}: UseListingPageImageModalViewportParams) {
  const [settings, setSettings] = useState<ModalViewportSettings>(() =>
    computeModalViewportSettings(),
  );

  useEffect(() => {
    if (!isOpen) return;

    let resizeTimeout: ReturnType<typeof setTimeout> | null = null;

    const updateViewportSettings = () => {
      const next = computeModalViewportSettings();
      setSettings((prev) => {
        if (
          prev.targetImageWidth === next.targetImageWidth &&
          prev.imageQuality === next.imageQuality &&
          prev.isMobileViewport === next.isMobileViewport
        ) {
          return prev;
        }
        return next;
      });
    };

    const scheduleUpdate = () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      resizeTimeout = setTimeout(updateViewportSettings, RESIZE_DEBOUNCE_MS);
    };

    updateViewportSettings();
    window.addEventListener('resize', scheduleUpdate);

    return () => {
      if (resizeTimeout) {
        clearTimeout(resizeTimeout);
      }
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, [isOpen]);

  return settings;
}
