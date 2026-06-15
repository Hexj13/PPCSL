export const DEV_TELEGRAM_USER_ID = '900000001';

export function isTelegramAuthMockAllowed(nodeEnv: string | undefined): boolean {
  return nodeEnv === 'development';
}
