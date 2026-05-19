import * as SecureStore from 'expo-secure-store';

const RETURN_KEY = 'kupito-mobile-auth-return';

export async function setAuthReturnPath(path: string): Promise<void> {
  await SecureStore.setItemAsync(RETURN_KEY, path);
}

export async function getAuthReturnPath(): Promise<string | null> {
  return SecureStore.getItemAsync(RETURN_KEY);
}

export async function clearAuthReturnPath(): Promise<void> {
  await SecureStore.deleteItemAsync(RETURN_KEY);
}

export function buildSignInHref(returnTo?: string): string {
  if (!returnTo) return '/auth/sign-in';
  return `/auth/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
}

export function isAuthRoute(path: string): boolean {
  return path.startsWith('/auth');
}

export function sanitizeReturnPath(path: string | null | undefined): string | null {
  if (!path || !path.startsWith('/') || isAuthRoute(path)) return null;
  return path;
}
