export function isTelegramDevMockEnabled(): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }
  return !process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID?.trim();
}
