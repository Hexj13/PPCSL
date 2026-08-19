import { defaultPlatformApiUrl, resolvePlatformImportCredentials } from './platform-import-env';

describe('resolvePlatformImportCredentials', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('prefers PPCSL_IMPORT_* over KUPITO_IMPORT_* and CIPAUTO_*', () => {
    process.env = {
      ...originalEnv,
      PPCSL_IMPORT_ADMIN_EMAIL: 'ppcsl@test.example',
      KUPITO_IMPORT_ADMIN_EMAIL: 'legacy-k@test.example',
      CIPAUTO_ADMIN_EMAIL: 'cipauto@test.example',
      PPCSL_IMPORT_ADMIN_PASSWORD: 'p0',
      KUPITO_IMPORT_ADMIN_PASSWORD: 'p1',
      CIPAUTO_ADMIN_PASSWORD: 'p2',
    };
    const result = resolvePlatformImportCredentials('local');
    expect(result.adminEmail).toBe('ppcsl@test.example');
    expect(result.adminPassword).toBe('p0');
  });

  it('falls back to KUPITO_IMPORT_* then CIPAUTO_*', () => {
    process.env = {
      ...originalEnv,
      PPCSL_IMPORT_ADMIN_EMAIL: '',
      KUPITO_IMPORT_ADMIN_EMAIL: 'legacy-k@test.example',
      CIPAUTO_ADMIN_EMAIL: 'cipauto@test.example',
      KUPITO_IMPORT_ADMIN_PASSWORD: 'p1',
      CIPAUTO_ADMIN_PASSWORD: 'p2',
    };
    delete process.env.PPCSL_IMPORT_ADMIN_PASSWORD;
    const result = resolvePlatformImportCredentials('local');
    expect(result.adminEmail).toBe('legacy-k@test.example');
    expect(result.adminPassword).toBe('p1');
  });

  it('falls back to CIPAUTO_* when PPCSL_IMPORT_* and KUPITO_IMPORT_* are unset', () => {
    process.env = {
      ...originalEnv,
      PPCSL_IMPORT_ADMIN_EMAIL: '',
      KUPITO_IMPORT_ADMIN_EMAIL: '',
      CIPAUTO_ADMIN_EMAIL: 'legacy@test.example',
      CIPAUTO_ADMIN_PASSWORD: 'legacy-pass',
    };
    delete process.env.PPCSL_IMPORT_ADMIN_PASSWORD;
    delete process.env.KUPITO_IMPORT_ADMIN_PASSWORD;
    const result = resolvePlatformImportCredentials('local');
    expect(result.adminEmail).toBe('legacy@test.example');
    expect(result.adminPassword).toBe('legacy-pass');
  });

  it('prefers PPCSL_IMPORT_API_URL over aliases', () => {
    process.env = {
      ...originalEnv,
      PPCSL_IMPORT_API_URL: 'https://api-ppcsl.example',
      KUPITO_IMPORT_API_URL: 'https://api-a.example',
      CIPAUTO_API_URL: 'https://api-b.example',
    };
    const result = resolvePlatformImportCredentials('local');
    expect(result.platformApiUrl).toBe('https://api-ppcsl.example');
  });

  it('uses localhost when local URL env is unset', () => {
    process.env = { ...originalEnv };
    delete process.env.PPCSL_IMPORT_API_URL;
    delete process.env.KUPITO_IMPORT_API_URL;
    delete process.env.CIPAUTO_API_URL;
    const result = resolvePlatformImportCredentials('local');
    expect(result.platformApiUrl).toBe('http://localhost:4000');
  });

  it('throws in prod when no API URL is set', () => {
    process.env = { ...originalEnv };
    delete process.env.PPCSL_IMPORT_API_URL;
    delete process.env.KUPITO_IMPORT_API_URL;
    delete process.env.CIPAUTO_API_URL;
    expect(() => defaultPlatformApiUrl('prod')).toThrow(/PPCSL_IMPORT_API_URL/);
    expect(() => resolvePlatformImportCredentials('prod')).toThrow(/PPCSL_IMPORT_API_URL/);
  });
});
