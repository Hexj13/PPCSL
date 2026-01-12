import { getPlatform, Platform } from '../script-guard';

import alConfig from './al/config';
import mkConfig, { PlatformSeedConfig } from './mk/config';

export { PlatformSeedConfig };

const configs: Record<Platform, PlatformSeedConfig> = {
  mk: mkConfig,
  al: alConfig,
  common: mkConfig,
};

export function getPlatformConfig(): PlatformSeedConfig {
  const platform = getPlatform();
  const config = configs[platform];

  if (!config) {
    console.error(`❌ No config found for platform: ${platform}`);
    console.error(`   Available platforms: ${Object.keys(configs).join(', ')}`);
    process.exit(1);
  }

  return config;
}

export { mkConfig, alConfig };
