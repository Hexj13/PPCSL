export type RuntimeEnv = 'local' | 'prod';

export type CliStatus = 'active' | 'paused';

export interface KupitoImportClientConfig {
  env: RuntimeEnv;
  kupitoApiUrl: string;
  adminEmail: string;
  adminPassword: string;
  importSecret: string;
  requestTimeoutMs: number;
  maxRetries: number;
  defaultDelayMs: number;
  imageStepDelayMs: number;
}

export interface BaseParserConfig extends KupitoImportClientConfig {
  registryPath: string;
  reportsDir: string;
}
