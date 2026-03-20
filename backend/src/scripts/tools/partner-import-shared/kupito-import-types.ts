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
