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
