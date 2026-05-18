type IntersectionVisibilityCallback = (isIntersecting: boolean) => void;

const elementCallbacks = new Map<Element, IntersectionVisibilityCallback>();
let observer: IntersectionObserver | null = null;

function getObserver(): IntersectionObserver {
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const cb = elementCallbacks.get(entry.target);
          if (cb) cb(entry.isIntersecting);
        }
      },
      { threshold: 0.01 },
    );
  }
  return observer;
}

export function observeElementVisibility(
  element: Element,
  callback: IntersectionVisibilityCallback,
): () => void {
  const obs = getObserver();
  elementCallbacks.set(element, callback);
  obs.observe(element);
  return () => {
    elementCallbacks.delete(element);
    obs.unobserve(element);
    if (elementCallbacks.size === 0 && observer) {
      observer.disconnect();
      observer = null;
    }
  };
}
