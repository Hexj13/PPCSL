import { resolveParsingTargetEnv } from './parsing-env';

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
