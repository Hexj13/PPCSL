'use client';

const STORAGE_KEY = 'kupito_nav_count_v1';

export function incrementNavigationCount(): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    const next = Number(sessionStorage.getItem(STORAGE_KEY) || '0') + 1;
    sessionStorage.setItem(STORAGE_KEY, String(next));
  } catch {
    return;
  }
}

export function getNavigationCount(): number {
  if (typeof sessionStorage === 'undefined') return 0;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const n = Number(raw || '0');
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}
