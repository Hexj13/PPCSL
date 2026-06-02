import type { RegisterDto } from '@/lib/api';
import { localStorageGetItem, localStorageRemoveItem } from '@/lib/browser-local-storage';
import {
  sessionStorageGetItem,
  sessionStorageRemoveItem,
  sessionStorageSetItem,
} from '@/lib/browser-session-storage';

const DATA_KEY = 'pendingRegistration';
const LEGACY_PASSWORD_KEY = 'pendingRegistrationPassword';

export type PendingRegistrationData = Omit<RegisterDto, 'password'>;

let pendingRegistrationPassword: string | null = null;

function parseRegistrationData(raw: string): PendingRegistrationData | null {
  try {
    const parsed = JSON.parse(raw) as RegisterDto;
    if (!parsed || typeof parsed !== 'object') return null;
    const { password: _password, ...rest } = parsed;
    return rest;
  } catch {
    return null;
  }
}

function migrateLegacyLocalStorage(): PendingRegistrationData | null {
  const legacy = localStorageGetItem(DATA_KEY);
  if (!legacy) return null;
  localStorageRemoveItem(DATA_KEY);
  const data = parseRegistrationData(legacy);
  if (!data) return null;
  try {
    const parsed = JSON.parse(legacy) as RegisterDto;
    sessionStorageSetItem(DATA_KEY, JSON.stringify(data));
    pendingRegistrationPassword = parsed.password ?? null;
  } catch {}
  sessionStorageRemoveItem(LEGACY_PASSWORD_KEY);
  return data;
}

export function savePendingRegistration(data: RegisterDto): void {
  const { password, ...rest } = data;
  sessionStorageSetItem(DATA_KEY, JSON.stringify(rest));
  pendingRegistrationPassword = password || null;
  sessionStorageRemoveItem(LEGACY_PASSWORD_KEY);
  localStorageRemoveItem(DATA_KEY);
}

export function loadPendingRegistration(): RegisterDto | null {
  let data = sessionStorageGetItem(DATA_KEY);
  if (!data) {
    const migrated = migrateLegacyLocalStorage();
    if (!migrated) return null;
    data = sessionStorageGetItem(DATA_KEY);
    if (!data) return null;
  }
  const payload = parseRegistrationData(data);
  if (!payload) {
    clearPendingRegistration();
    return null;
  }
  const legacyPassword = sessionStorageGetItem(LEGACY_PASSWORD_KEY);
  if (legacyPassword) {
    pendingRegistrationPassword = legacyPassword;
    sessionStorageRemoveItem(LEGACY_PASSWORD_KEY);
  }
  const password = pendingRegistrationPassword ?? '';
  return { ...payload, password };
}

export function clearPendingRegistration(): void {
  pendingRegistrationPassword = null;
  sessionStorageRemoveItem(DATA_KEY);
  sessionStorageRemoveItem(LEGACY_PASSWORD_KEY);
  localStorageRemoveItem(DATA_KEY);
}
