import { buildParsingChildProcessEnv, resolveParsingTargetEnv } from './parsing-env';

describe('parsing-env', () => {
  const original = process.env.ADMIN_PARSING_TARGET_ENV;

  afterEach(() => {
    if (original === undefined) {
      delete process.env.ADMIN_PARSING_TARGET_ENV;
    } else {
      process.env.ADMIN_PARSING_TARGET_ENV = original;
    }
  });

  it('defaults to local when unset', () => {
    delete process.env.ADMIN_PARSING_TARGET_ENV;
    expect(resolveParsingTargetEnv()).toBe('local');
  });

  it('maps production aliases to prod', () => {
    process.env.ADMIN_PARSING_TARGET_ENV = 'PRODUCTION';
    expect(resolveParsingTargetEnv()).toBe('prod');
    process.env.ADMIN_PARSING_TARGET_ENV = 'prod';
    expect(resolveParsingTargetEnv()).toBe('prod');
  });
});

describe('buildParsingChildProcessEnv', () => {
  const forwardedKeys = [
    'PARSING_RUNTIME_DIR',
    'CIPAUTO_REGISTRY_PATH',
    'CIPAUTO_CURRENT_PLP_PATH',
    'CIPAUTO_REPORTS_DIR',
    'SITE999MD_REGISTRY_PATH',
    'SITE999MD_REPORTS_DIR',
  ] as const;

  const originals: Partial<Record<(typeof forwardedKeys)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of forwardedKeys) {
      originals[key] = process.env[key];
    }
  });

  afterEach(() => {
    for (const key of forwardedKeys) {
      if (originals[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originals[key];
      }
    }
  });

  it('forwards disk and parser override paths when non-empty', () => {
    process.env.PARSING_RUNTIME_DIR = '/var/data/parsing';
    process.env.CIPAUTO_REGISTRY_PATH = '/custom/cipauto-registry.json';
    delete process.env.SITE999MD_REGISTRY_PATH;

    const env = buildParsingChildProcessEnv('local');

    expect(env.PARSING_RUNTIME_DIR).toBe('/var/data/parsing');
    expect(env.CIPAUTO_REGISTRY_PATH).toBe('/custom/cipauto-registry.json');
    expect(env.SITE999MD_REGISTRY_PATH).toBeUndefined();
  });

  it('forwards SITE999MD_REPORTS_DIR when set', () => {
    process.env.SITE999MD_REPORTS_DIR = '/var/reports/999md';
    const env = buildParsingChildProcessEnv('prod');
    expect(env.SITE999MD_REPORTS_DIR).toBe('/var/reports/999md');
    expect(env.ADMIN_PARSING_TARGET_ENV).toBe('prod');
  });
});
