'use client';

let inflightCount = 0;
const pendingByElement = new WeakMap<HTMLImageElement, boolean>();

export function getImageInflightCount(): number {
  return inflightCount;
}

export function attachImageInflightListeners(el: HTMLImageElement): () => void {
  const onLoadStart = () => {
    if (!pendingByElement.has(el)) {
      pendingByElement.set(el, true);
      inflightCount += 1;
    }
  };
  const onDone = () => {
    if (pendingByElement.get(el)) {
      pendingByElement.delete(el);
      inflightCount = Math.max(0, inflightCount - 1);
    }
  };
  el.addEventListener('loadstart', onLoadStart);
  el.addEventListener('load', onDone);
  el.addEventListener('error', onDone);
  return () => {
    el.removeEventListener('loadstart', onLoadStart);
    el.removeEventListener('load', onDone);
    el.removeEventListener('error', onDone);
    if (pendingByElement.get(el)) {
      pendingByElement.delete(el);
      inflightCount = Math.max(0, inflightCount - 1);
    }
  };
}

export function resolveUnderlyingImg(
  node: HTMLElement | HTMLImageElement | null,
): HTMLImageElement | null {
  if (!node) return null;
  if (node instanceof HTMLImageElement) return node;
  return node.querySelector('img');
}
