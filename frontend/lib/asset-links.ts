import { loadSiteConfigSync } from './site-config';
import { getCountry } from './utils';

export type AssetLinksStatement = {
  relation: string[];
  target: {
    namespace: 'android_app';
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
};

export function parseSha256Fingerprints(raw: string | undefined): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((fingerprint) => fingerprint.trim())
    .filter(Boolean);
}

export function buildAndroidAssetLinks(
  packageName: string,
  fingerprints: string[],
): AssetLinksStatement[] {
  if (fingerprints.length === 0) return [];
  return [
    {
      relation: ['delegate_permission/common.handle_all_urls'],
      target: {
        namespace: 'android_app',
        package_name: packageName,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
}

export function getAndroidAssetLinksFromEnv(): AssetLinksStatement[] {
  const packageName =
    process.env.MOBILE_APP_PACKAGE_NAME?.trim() ||
    loadSiteConfigSync(getCountry()).mobileApp?.androidPackageName?.trim() ||
    '';
  if (!packageName) return [];
  const fingerprints = parseSha256Fingerprints(process.env.MOBILE_APP_SHA256_FINGERPRINTS);
  return buildAndroidAssetLinks(packageName, fingerprints);
}
