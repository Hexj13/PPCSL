import {
  buildAndroidAssetLinks,
  getAndroidAssetLinksFromEnv,
  parseSha256Fingerprints,
} from './asset-links';

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
      expect(buildAndroidAssetLinks('club.kupito.app', [])).toEqual([]);
    });

    it('builds delegate_permission statement', () => {
      const links = buildAndroidAssetLinks('club.kupito.app', ['AA:BB']);
      expect(links).toHaveLength(1);
      expect(links[0]?.relation).toContain('delegate_permission/common.handle_all_urls');
      expect(links[0]?.target.package_name).toBe('club.kupito.app');
      expect(links[0]?.target.sha256_cert_fingerprints).toEqual(['AA:BB']);
    });
  });

  describe('getAndroidAssetLinksFromEnv', () => {
    const originalPackage = process.env.MOBILE_APP_PACKAGE_NAME;
    const originalFingerprints = process.env.MOBILE_APP_SHA256_FINGERPRINTS;

    afterEach(() => {
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

    it('reads package and fingerprints from environment', () => {
      process.env.MOBILE_APP_PACKAGE_NAME = 'club.kupito.app';
      process.env.MOBILE_APP_SHA256_FINGERPRINTS = '11:22';
      const links = getAndroidAssetLinksFromEnv();
      expect(links[0]?.target.sha256_cert_fingerprints).toEqual(['11:22']);
    });
  });
});
