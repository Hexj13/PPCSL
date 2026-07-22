export const GIS_BUTTON_READY_TIMEOUT_MS = 8_000;

type GisRenderButton = (
  parent: HTMLElement,
  options: Record<string, string | boolean | number | (() => void)>,
) => void;

export function buildGisButtonOptions(onClick: () => void) {
  return {
    type: 'icon',
    theme: 'outline',
    size: 'large',
    click_listener: onClick,
  } as const;
}

export function mountGisIconButton(options: {
  container: HTMLDivElement;
  renderButton: GisRenderButton;
  onClick: () => void;
  isMounted: () => boolean;
  clearReadyTimeout: () => void;
  scheduleReadyTimeout: (callback: () => void, delayMs: number) => void;
  onReadyChange: (ready: boolean) => void;
  onTimedOutChange: (timedOut: boolean) => void;
}): () => void {
  const {
    container,
    renderButton,
    onClick,
    isMounted,
    clearReadyTimeout,
    scheduleReadyTimeout,
    onReadyChange,
    onTimedOutChange,
  } = options;

  let cancelled = false;
  const gisButtonOptions = buildGisButtonOptions(onClick);

  const updateButtonReady = () => {
    if (cancelled || !isMounted()) return;
    const ready = container.childElementCount > 0;
    onReadyChange(ready);
    if (ready) {
      onTimedOutChange(false);
    }
  };

  clearReadyTimeout();
  onTimedOutChange(false);
  container.innerHTML = '';
  onReadyChange(false);
  renderButton(container, gisButtonOptions);
  updateButtonReady();

  if (container.childElementCount > 0) {
    return () => {
      cancelled = true;
      clearReadyTimeout();
    };
  }

  scheduleReadyTimeout(() => {
    if (cancelled || !isMounted()) return;
    if (container.childElementCount > 0) {
      updateButtonReady();
      return;
    }
    container.innerHTML = '';
    renderButton(container, gisButtonOptions);
    if (container.childElementCount > 0) {
      updateButtonReady();
      return;
    }
    onTimedOutChange(true);
  }, GIS_BUTTON_READY_TIMEOUT_MS);

  if (typeof MutationObserver === 'undefined') {
    return () => {
      cancelled = true;
      clearReadyTimeout();
    };
  }

  const observer = new MutationObserver(() => {
    if (container.childElementCount > 0) {
      updateButtonReady();
      observer.disconnect();
    }
  });
  observer.observe(container, { childList: true });

  return () => {
    cancelled = true;
    clearReadyTimeout();
    observer.disconnect();
  };
}
