describe('browser-session-storage', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'sessionStorage');

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(window, 'sessionStorage', originalDescriptor);
    } else {
      delete (window as unknown as { sessionStorage?: Storage }).sessionStorage;
    }
  });

  it('reads and writes through helpers when sessionStorage works', async () => {
    jest.resetModules();
    const { sessionStorageGetItem, sessionStorageRemoveItem, sessionStorageSetItem } =
      await import('@/lib/browser-session-storage');

    sessionStorage.removeItem('ppcsl_ss_test_key');
    sessionStorageSetItem('ppcsl_ss_test_key', 'v');
    expect(sessionStorageGetItem('ppcsl_ss_test_key')).toBe('v');
    sessionStorageRemoveItem('ppcsl_ss_test_key');
    expect(sessionStorageGetItem('ppcsl_ss_test_key')).toBeNull();
  });

  it('returns safe fallbacks when sessionStorage operations throw SecurityError', async () => {
    const broken: Storage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {
        throw new DOMException('Access is denied', 'SecurityError');
      },
      setItem: () => {
        throw new DOMException('Access is denied', 'SecurityError');
      },
    };
    Object.defineProperty(window, 'sessionStorage', {
      configurable: true,
      writable: true,
      value: broken,
    });

    jest.resetModules();
    const mod = await import('@/lib/browser-session-storage');
    expect(mod.isSessionStorageUsable()).toBe(false);
    expect(mod.sessionStorageGetItem('any')).toBeNull();
    expect(mod.sessionStorageSetItem('any', 'x')).toBeUndefined();
    expect(mod.sessionStorageRemoveItem('any')).toBeUndefined();
  });
});
