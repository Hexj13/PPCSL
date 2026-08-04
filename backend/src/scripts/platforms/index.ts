import type { Platform } from '../script-guard';
import { getPlatform } from '../script-guard';

import alConfig, { PlatformSeedConfig } from './al/config';
import mdConfig from './md/config';

export { PlatformSeedConfig };

const configs: Record<Platform, PlatformSeedConfig> = {
  md: mdConfig,
  al: alConfig,
  common: mdConfig,
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

export { alConfig, mdConfig };
