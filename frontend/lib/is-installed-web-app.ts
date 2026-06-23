interface NavigatorStandalone extends Navigator {
  standalone?: boolean;
}

const INSTALLED_DISPLAY_MODES = ['standalone'] as const;

export function isInstalledWebApp(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorStandalone = window.navigator as NavigatorStandalone;
  if (navigatorStandalone.standalone === true) {
    return true;
  }

  if (window.matchMedia) {
    for (const mode of INSTALLED_DISPLAY_MODES) {
      if (window.matchMedia(`(display-mode: ${mode})`).matches) {
        return true;
      }
    }
  }

  if (typeof document !== 'undefined' && document.referrer.startsWith('android-app://')) {
    return true;
  }

  return false;
}

export function shouldOpenLinkInNewTab(): boolean {
  return !isInstalledWebApp();
}
