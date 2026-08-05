export type AuthCredentials = {
  login: string;
  password: string;
};

const DEFAULT_E2E_LOGIN = 'admin@admin.com';
const DEFAULT_E2E_PASSWORD = 'GGGgggTEST777';

export function getAuthCredentials(): AuthCredentials {
  const login = process.env.E2E_USER_LOGIN?.trim();
  const password = process.env.E2E_USER_PASSWORD?.trim();
  return {
    login: login || DEFAULT_E2E_LOGIN,
    password: password || DEFAULT_E2E_PASSWORD,
  };
}

export function requireAuthCredentials(): AuthCredentials {
  const credentials = getAuthCredentials();
  if (!credentials.login || !credentials.password) {
    throw new Error('Missing E2E_USER_LOGIN or E2E_USER_PASSWORD');
  }
  return credentials;
}

export { buildUniquePlatformPhone } from '../platform/contract';
