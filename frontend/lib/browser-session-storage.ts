let sessionStorageUsable: boolean | null = null;

function probeSessionStorage(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const key = '__ss_probe__';
    window.sessionStorage.setItem(key, '1');
    window.sessionStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function isSessionStorageUsable(): boolean {
  if (typeof window === 'undefined') return false;
  if (sessionStorageUsable === null) {
    sessionStorageUsable = probeSessionStorage();
  }
  return sessionStorageUsable;
}

export function sessionStorageGetItem(key: string): string | null {
  if (!isSessionStorageUsable()) return null;
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

export function sessionStorageSetItem(key: string, value: string): void {
  if (!isSessionStorageUsable()) return;
  try {
    window.sessionStorage.setItem(key, value);
  } catch {}
}

export function sessionStorageRemoveItem(key: string): void {
  if (!isSessionStorageUsable()) return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {}
}
