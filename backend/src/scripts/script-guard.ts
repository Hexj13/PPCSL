export function checkEnvironment(allowedEnvironments: string[]): void {
  const nodeEnv = process.env.NODE_ENV || 'development';
  const isProduction = nodeEnv === 'production';

  if (isProduction && !allowedEnvironments.includes('production')) {
    console.error('❌ This script cannot be run in production environment!');
    console.error(`   Current environment: ${nodeEnv}`);
    console.error(`   Allowed environments: ${allowedEnvironments.join(', ')}`);
    process.exit(1);
  }

  if (!allowedEnvironments.includes(nodeEnv) && !allowedEnvironments.includes('all')) {
    console.warn(`⚠️  Warning: This script is intended for: ${allowedEnvironments.join(', ')}`);
    console.warn(`   Current environment: ${nodeEnv}`);
  }
}

export type Platform = 'md' | 'common';

export function checkPlatform(allowedPlatforms: Platform[]): void {
  const currentPlatform = (process.env.COUNTRY ||
    process.env.NEXT_PUBLIC_COUNTRY ||
    'md') as Platform;

  if (allowedPlatforms.includes('common')) {
    return;
  }

  if (!allowedPlatforms.includes(currentPlatform)) {
    console.error('');
    console.error('╔═══════════════════════════════════════════════════════════════╗');
    console.error('║  ❌ PLATFORM MISMATCH - Script not allowed for this platform  ║');
    console.error('╠═══════════════════════════════════════════════════════════════╣');
    console.error(`║  Current platform:  ${currentPlatform.padEnd(42)}║`);
    console.error(`║  Allowed platforms: ${allowedPlatforms.join(', ').padEnd(42)}║`);
    console.error('╠═══════════════════════════════════════════════════════════════╣');
    console.error('║  Set COUNTRY env variable to change platform:                 ║');
    console.error('║  COUNTRY=md npx ts-node script.ts                             ║');
    console.error('╚═══════════════════════════════════════════════════════════════╝');
    console.error('');
    process.exit(1);
  }

  console.log(`🌍 Platform: ${currentPlatform.toUpperCase()}`);
}

export function getPlatform(): Platform {
  return (process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY || 'md') as Platform;
}
