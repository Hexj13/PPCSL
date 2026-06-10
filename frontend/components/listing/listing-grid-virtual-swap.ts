type VirtualSwapListener = () => void;

let virtualSwapListener: VirtualSwapListener | null = null;

export function registerListingGridVirtualSwapListener(listener: VirtualSwapListener): () => void {
  virtualSwapListener = listener;
  return () => {
    if (virtualSwapListener === listener) {
      virtualSwapListener = null;
    }
  };
}

export function requestListingGridVirtualSwap(): void {
  virtualSwapListener?.();
}
