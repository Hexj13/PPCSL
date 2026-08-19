describe('browser-local-storage', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(window, 'localStorage');

  afterEach(() => {
    if (originalDescriptor) {
      Object.defineProperty(window, 'localStorage', originalDescriptor);
    } else {
      delete (window as unknown as { localStorage?: Storage }).localStorage;
    }
  });

  it('reads and writes through helpers when localStorage works', async () => {
    jest.resetModules();
    const { localStorageGetItem, localStorageRemoveItem, localStorageSetItem } =
      await import('@/lib/browser-local-storage');
    localStorage.removeItem('ppcsl_ls_test_key');
    localStorageSetItem('ppcsl_ls_test_key', 'v');
    expect(localStorageGetItem('ppcsl_ls_test_key')).toBe('v');
    localStorageRemoveItem('ppcsl_ls_test_key');
    expect(localStorageGetItem('ppcsl_ls_test_key')).toBeNull();
  });

  it('uses in-memory storage when localStorage operations throw SecurityError', async () => {
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
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      writable: true,
      value: broken,
    });

    jest.resetModules();
    const mod = await import('@/lib/browser-local-storage');
    expect(mod.isLocalStorageUsable()).toBe(false);
    expect(mod.localStorageGetItem('any')).toBeNull();
    expect(mod.localStorageSetItem('any', 'x')).toBeUndefined();
    expect(mod.localStorageRemoveItem('any')).toBeUndefined();

    const mem = mod.getLocalStorageOrMemory();
    mem.setItem('a', '1');
    expect(mem.getItem('a')).toBe('1');

    const persistStorage = mod.createPersistJSONStorage();
    expect(persistStorage.getItem('zustand_test')).toBeNull();
  });

  it('createPersistJSONStorage getItem returns stored value', async () => {
    jest.resetModules();
    const mod = await import('@/lib/browser-local-storage');
    const persistStorage = mod.createPersistJSONStorage();
    void persistStorage.setItem('foo', '{"state":1}');
    expect(persistStorage.getItem('foo')).toBe('{"state":1}');
    void persistStorage.removeItem('foo');
  });

  it('isStorageAccessError detects SecurityError', async () => {
    jest.resetModules();
    const { isStorageAccessError } = await import('@/lib/browser-local-storage');
    expect(isStorageAccessError(new DOMException('x', 'SecurityError'))).toBe(true);
    expect(isStorageAccessError(new Error('other'))).toBe(false);
    expect(isStorageAccessError(null)).toBe(false);
  });
});
