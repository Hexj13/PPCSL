import type { KupitoImportClientConfig } from '../../partner-import-shared/kupito-import-types';
import type { LoginResponse } from '../types';
import { requestJson } from '../utils/http';

export class AuthClient {
  private accessToken = '';
  private refreshToken = '';
  private userType = '';

  constructor(private readonly config: KupitoImportClientConfig) {}

  async login(): Promise<void> {
    const url = `${this.config.kupitoApiUrl}/api/auth/login`;
    const { data } = await requestJson<LoginResponse>({
      url,
      method: 'POST',
      timeoutMs: this.config.requestTimeoutMs,
      retries: this.config.maxRetries,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: this.config.adminEmail,
        password: this.config.adminPassword,
      }),
    });
    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.userType = data.user?.type ?? '';
    if (this.userType !== 'Admin') {
      throw new Error(`Import user must be Admin. Received type: ${this.userType || 'unknown'}`);
    }
  }

  getAccessToken(): string {
    if (!this.accessToken) {
      throw new Error('Access token is empty. Call login() first.');
    }
    return this.accessToken;
  }

  async refresh(): Promise<void> {
    if (!this.refreshToken) {
      throw new Error('Refresh token is empty. Call login() first.');
    }
    const url = `${this.config.kupitoApiUrl}/api/auth/refresh`;
    const { data } = await requestJson<LoginResponse>({
      url,
      method: 'POST',
      timeoutMs: this.config.requestTimeoutMs,
      retries: this.config.maxRetries,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: this.refreshToken,
      }),
    });

    this.accessToken = data.access_token;
    this.refreshToken = data.refresh_token;
    this.userType = data.user?.type ?? this.userType;
  }
}
