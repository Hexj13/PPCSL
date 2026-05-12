type ScrollFrameCallback = () => void;

const scrollFrameCallbacks = new Set<ScrollFrameCallback>();
let rafId: number | null = null;
let ticking = false;
let listenerAttached = false;

function runCallbacks() {
  scrollFrameCallbacks.forEach((cb) => cb());
}

function onWindowScroll() {
  if (!ticking) {
    ticking = true;
    rafId = requestAnimationFrame(() => {
      runCallbacks();
      ticking = false;
      rafId = null;
    });
  }
}

export function subscribeWindowScrollFrame(cb: ScrollFrameCallback): () => void {
  if (typeof window === 'undefined') return () => {};
  scrollFrameCallbacks.add(cb);
  if (!listenerAttached) {
    window.addEventListener('scroll', onWindowScroll, { passive: true });
    listenerAttached = true;
  }
  return () => {
    scrollFrameCallbacks.delete(cb);
    if (scrollFrameCallbacks.size === 0) {
      if (listenerAttached) {
        window.removeEventListener('scroll', onWindowScroll);
        listenerAttached = false;
      }
      if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      ticking = false;
    }
  };
}
