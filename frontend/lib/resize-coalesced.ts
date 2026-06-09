export function addCoalescedResizeListener(handler: () => void): () => void {
  let rafId = 0;

  const onResize = () => {
    if (rafId !== 0) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      handler();
    });
  };

  window.addEventListener('resize', onResize);

  return () => {
    window.removeEventListener('resize', onResize);
    if (rafId !== 0) {
      cancelAnimationFrame(rafId);
    }
  };
}

export function createCoalescedCallback(handler: () => void): () => void {
  let rafId = 0;

  return () => {
    if (rafId !== 0) {
      return;
    }
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      handler();
    });
  };
}
