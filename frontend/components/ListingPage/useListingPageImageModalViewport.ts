import { useEffect, useState } from 'react';

type UseListingPageImageModalViewportParams = {
  isOpen: boolean;
};

export function useListingPageImageModalViewport({
  isOpen,
}: UseListingPageImageModalViewportParams) {
  const [targetImageWidth, setTargetImageWidth] = useState(1920);
  const [imageQuality, setImageQuality] = useState(85);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const updateViewportSettings = () => {
      type NetworkConnection = {
        effectiveType?: string;
        saveData?: boolean;
      };

      const viewportWidth = window.innerWidth;
      const isMobile = viewportWidth <= 768;
      const connection = (navigator as Navigator & { connection?: NetworkConnection }).connection;
      const hasSlowNetwork =
        connection?.saveData === true ||
        ['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '');
      const pixelRatio = Math.min(window.devicePixelRatio || 1, isMobile ? 2.2 : 3);
      const widthMultiplier = isMobile ? 1 : 1.2;
      const minWidth = isMobile ? 640 : 900;
      const maxWidth = isMobile ? (hasSlowNetwork ? 1200 : 1440) : 1920;
      const quality = isMobile ? (hasSlowNetwork ? 68 : 75) : 85;
      const computedTargetWidth = Math.min(
        maxWidth,
        Math.max(minWidth, Math.round(viewportWidth * pixelRatio * widthMultiplier)),
      );
      const normalizationStep = isMobile ? 80 : 120;
      const normalizedTargetWidth =
        Math.round(computedTargetWidth / normalizationStep) * normalizationStep;

      setTargetImageWidth((prev) => {
        if (Math.abs(prev - normalizedTargetWidth) < 50) return prev;
        return normalizedTargetWidth;
      });
      setIsMobileViewport(isMobile);
      setImageQuality((prev) => (prev === quality ? prev : quality));
    };

    updateViewportSettings();
    window.addEventListener('resize', updateViewportSettings);

    return () => {
      window.removeEventListener('resize', updateViewportSettings);
    };
  }, [isOpen]);

  return { targetImageWidth, imageQuality, isMobileViewport };
}
