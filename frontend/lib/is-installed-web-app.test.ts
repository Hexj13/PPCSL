import { isInstalledWebApp, shouldOpenLinkInNewTab } from './is-installed-web-app';

type MatchMediaQuery = '(display-mode: standalone)' | '(display-mode: fullscreen)';

function mockMatchMedia(matchesByQuery: Partial<Record<MatchMediaQuery, boolean>>) {
  window.matchMedia = jest.fn((query: string) => ({
    matches: matchesByQuery[query as MatchMediaQuery] ?? false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })) as typeof window.matchMedia;
}

describe('isInstalledWebApp', () => {
  const originalReferrer = document.referrer;

  beforeEach(() => {
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: '',
      writable: true,
    });
    mockMatchMedia({});
    Object.defineProperty(window.navigator, 'standalone', {
      configurable: true,
      value: undefined,
      writable: true,
    });
  });

  afterEach(() => {
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: originalReferrer,
      writable: true,
    });
    jest.restoreAllMocks();
  });

  it('returns true when navigator.standalone is true (iOS PWA)', () => {
    Object.defineProperty(window.navigator, 'standalone', {
      configurable: true,
      value: true,
      writable: true,
    });

    expect(isInstalledWebApp()).toBe(true);
    expect(shouldOpenLinkInNewTab()).toBe(false);
  });

  it('returns true when display-mode is standalone', () => {
    mockMatchMedia({ '(display-mode: standalone)': true });

    expect(isInstalledWebApp()).toBe(true);
    expect(shouldOpenLinkInNewTab()).toBe(false);
  });

  it('returns false when display-mode is fullscreen (browser fullscreen, not an installed app)', () => {
    mockMatchMedia({ '(display-mode: fullscreen)': true });

    expect(isInstalledWebApp()).toBe(false);
    expect(shouldOpenLinkInNewTab()).toBe(true);
  });

  it('returns true when referrer is android-app (TWA fallback)', () => {
    Object.defineProperty(document, 'referrer', {
      configurable: true,
      value: 'android-app://club.kupito.app/https/kupito.club/',
      writable: true,
    });

    expect(isInstalledWebApp()).toBe(true);
    expect(shouldOpenLinkInNewTab()).toBe(false);
  });

  it('returns false in a regular browser', () => {
    expect(isInstalledWebApp()).toBe(false);
    expect(shouldOpenLinkInNewTab()).toBe(true);
  });
});
