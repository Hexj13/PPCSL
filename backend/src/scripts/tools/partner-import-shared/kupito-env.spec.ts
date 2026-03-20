import { resolveKupitoImportCredentials } from './kupito-env';

describe('resolveKupitoImportCredentials', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers KUPITO_IMPORT_ADMIN_EMAIL over legacy CIPAUTO_ADMIN_EMAIL', () => {
    process.env = {
      ...originalEnv,
      KUPITO_IMPORT_ADMIN_EMAIL: 'kupito@test.example',
      CIPAUTO_ADMIN_EMAIL: 'cipauto@test.example',
      KUPITO_IMPORT_ADMIN_PASSWORD: 'p1',
      CIPAUTO_ADMIN_PASSWORD: 'p2',
    };
    const result = resolveKupitoImportCredentials('local');
    expect(result.adminEmail).toBe('kupito@test.example');
    expect(result.adminPassword).toBe('p1');
  });

  it('falls back to CIPAUTO_* when KUPITO_IMPORT_* is unset', () => {
    process.env = {
      ...originalEnv,
      KUPITO_IMPORT_ADMIN_EMAIL: '',
      CIPAUTO_ADMIN_EMAIL: 'legacy@test.example',
      CIPAUTO_ADMIN_PASSWORD: 'legacy-pass',
    };
    delete process.env.KUPITO_IMPORT_ADMIN_PASSWORD;
    const result = resolveKupitoImportCredentials('local');
    expect(result.adminEmail).toBe('legacy@test.example');
    expect(result.adminPassword).toBe('legacy-pass');
  });

  it('prefers KUPITO_IMPORT_API_URL over CIPAUTO_API_URL', () => {
    process.env = {
      ...originalEnv,
      KUPITO_IMPORT_API_URL: 'https://api-a.example',
      CIPAUTO_API_URL: 'https://api-b.example',
    };
    const result = resolveKupitoImportCredentials('local');
    expect(result.kupitoApiUrl).toBe('https://api-a.example');
  });
});
