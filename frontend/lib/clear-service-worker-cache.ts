export function clearServiceWorkerUserCaches(): void {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  const controller = navigator.serviceWorker.controller;
  if (controller) {
    controller.postMessage({ type: 'CLEAR_USER_CACHE' });
    return;
  }
  void navigator.serviceWorker.ready.then((registration) => {
    registration.active?.postMessage({ type: 'CLEAR_USER_CACHE' });
  });
}
