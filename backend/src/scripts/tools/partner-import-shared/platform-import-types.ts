export type RuntimeEnv = 'local' | 'prod';

export type CliStatus = 'active' | 'paused';

export interface PlatformImportClientConfig {
  env: RuntimeEnv;
  platformApiUrl: string;
  adminEmail: string;
  adminPassword: string;
  importSecret: string;
  requestTimeoutMs: number;
  maxRetries: number;
  defaultDelayMs: number;
  imageStepDelayMs: number;
}

export interface BaseParserConfig extends PlatformImportClientConfig {
  registryPath: string;
  reportsDir: string;
}
