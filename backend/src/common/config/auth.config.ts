import { registerAs } from '@nestjs/config';

function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }
  return 'default-dev-secret';
}

export const authConfig = registerAs('auth', () => ({
  jwtSecret: resolveJwtSecret(),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  cronSecret: process.env.CRON_SECRET || '',
}));

export type AuthConfig = ReturnType<typeof authConfig>;
