import { formatApiHello, resolvePlatformName, resolveSmsBrandName } from './platform-name';

describe('resolvePlatformName', () => {
  it('prefers SITE_NAME over overlay and URL hostname', () => {
    expect(
      resolvePlatformName({
        env: {
          SITE_NAME: 'FromEnv',
          PLATFORM_NAME: 'FromPlatform',
          FRONTEND_URL: 'https://host.example',
        },
        overlayName: 'FromOverlay',
      }),
    ).toBe('FromEnv');
  });

  it('uses PLATFORM_NAME when SITE_NAME is blank', () => {
    expect(
      resolvePlatformName({
        env: { SITE_NAME: '  ', PLATFORM_NAME: 'FromPlatform' },
        overlayName: null,
      }),
    ).toBe('FromPlatform');
  });

  it('uses overlay name before URL hostname', () => {
    expect(
      resolvePlatformName({
        env: { FRONTEND_URL: 'https://host.example' },
        overlayName: 'FromOverlay',
      }),
    ).toBe('FromOverlay');
  });

  it('uses FRONTEND_URL hostname when overlay is skipped', () => {
    expect(
      resolvePlatformName({
        env: { FRONTEND_URL: 'https://shop.example' },
        overlayName: null,
      }),
    ).toBe('shop.example');
  });

  it('ignores localhost URLs and falls back to API', () => {
    expect(
      resolvePlatformName({
        env: { FRONTEND_URL: 'http://localhost:3000' },
        overlayName: null,
      }),
    ).toBe('API');
  });
});

describe('resolveSmsBrandName', () => {
  it('prefers SMS_BRAND_NAME over SITE_NAME', () => {
    expect(
      resolveSmsBrandName({
        SMS_BRAND_NAME: 'SmsBrand',
        SITE_NAME: 'SiteBrand',
      }),
    ).toBe('SmsBrand');
  });

  it('falls back to resolvePlatformName', () => {
    expect(resolveSmsBrandName({ SITE_NAME: 'SiteBrand' })).toBe('SiteBrand');
  });
});

describe('formatApiHello', () => {
  it('appends API version to the platform name', () => {
    expect(formatApiHello('Brand')).toBe('Brand API v1.0');
  });
});
