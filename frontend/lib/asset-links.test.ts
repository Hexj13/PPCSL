import {
  buildAndroidAssetLinks,
  getAndroidAssetLinksFromEnv,
  parseSha256Fingerprints,
} from './asset-links';
import { loadSiteConfigSync } from './site-config';

jest.mock('./site-config', () => ({
  loadSiteConfigSync: jest.fn(() => ({ mobileApp: {} })),
}));

jest.mock('./utils', () => ({
  getCountry: () => 'al',
}));

const mockLoadSiteConfigSync = loadSiteConfigSync as jest.MockedFunction<typeof loadSiteConfigSync>;

describe('asset-links', () => {
  describe('parseSha256Fingerprints', () => {
    it('parses comma-separated fingerprints', () => {
      expect(parseSha256Fingerprints('AA:BB, CC:DD ')).toEqual(['AA:BB', 'CC:DD']);
    });

    it('returns empty array for blank input', () => {
      expect(parseSha256Fingerprints('')).toEqual([]);
      expect(parseSha256Fingerprints(undefined)).toEqual([]);
    });
  });

  describe('buildAndroidAssetLinks', () => {
    it('returns empty array when no fingerprints', () => {
      expect(buildAndroidAssetLinks('com.example.app', [])).toEqual([]);
    });

    it('builds delegate_permission statement', () => {
      const links = buildAndroidAssetLinks('com.example.app', ['AA:BB']);
      expect(links).toHaveLength(1);
      expect(links[0]?.relation).toContain('delegate_permission/common.handle_all_urls');
      expect(links[0]?.target.package_name).toBe('com.example.app');
      expect(links[0]?.target.sha256_cert_fingerprints).toEqual(['AA:BB']);
    });
  });

  describe('getAndroidAssetLinksFromEnv', () => {
    const originalPackage = process.env.MOBILE_APP_PACKAGE_NAME;
    const originalFingerprints = process.env.MOBILE_APP_SHA256_FINGERPRINTS;

    afterEach(() => {
      mockLoadSiteConfigSync.mockReturnValue({ mobileApp: {} } as ReturnType<
        typeof loadSiteConfigSync
      >);
      if (originalPackage === undefined) {
        delete process.env.MOBILE_APP_PACKAGE_NAME;
      } else {
        process.env.MOBILE_APP_PACKAGE_NAME = originalPackage;
      }
      if (originalFingerprints === undefined) {
        delete process.env.MOBILE_APP_SHA256_FINGERPRINTS;
      } else {
        process.env.MOBILE_APP_SHA256_FINGERPRINTS = originalFingerprints;
      }
    });

    it('returns empty array when package name is missing', () => {
      delete process.env.MOBILE_APP_PACKAGE_NAME;
      process.env.MOBILE_APP_SHA256_FINGERPRINTS = '11:22';
      expect(getAndroidAssetLinksFromEnv()).toEqual([]);
    });

    it('uses the overlay package name when env is unset', () => {
      delete process.env.MOBILE_APP_PACKAGE_NAME;
      process.env.MOBILE_APP_SHA256_FINGERPRINTS = '11:22';
      mockLoadSiteConfigSync.mockReturnValue({
        mobileApp: { androidPackageName: 'com.example.app' },
      } as ReturnType<typeof loadSiteConfigSync>);
      const links = getAndroidAssetLinksFromEnv();
      expect(links[0]?.target.package_name).toBe('com.example.app');
    });

    it('reads package and fingerprints from environment', () => {
      process.env.MOBILE_APP_PACKAGE_NAME = 'com.example.app';
      process.env.MOBILE_APP_SHA256_FINGERPRINTS = '11:22';
      const links = getAndroidAssetLinksFromEnv();
      expect(links[0]?.target.sha256_cert_fingerprints).toEqual(['11:22']);
    });
  });
});
