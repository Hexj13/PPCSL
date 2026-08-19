import type { LoginResponse } from '../listing-types';
import type { PlatformImportClientConfig } from '../platform-import-types';
import { requestJsonWithResponse } from '../utils/http';
import { mergePlatformAuthTokensFromBodyAndCookies } from '../utils/platform-auth-token-extract';

export class AuthClient {
  private accessToken = '';
  private refreshToken = '';
  private userType = '';

  constructor(private readonly config: PlatformImportClientConfig) {}

  async login(): Promise<void> {
    const url = `${this.config.platformApiUrl}/api/auth/login`;
    const { data, response } = await requestJsonWithResponse<LoginResponse>({
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
    const tokens = mergePlatformAuthTokensFromBodyAndCookies(data, response);
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.userType = data.user?.type ?? '';
    if (this.userType !== 'Admin') {
      throw new Error(`Import user must be Admin. Received type: ${this.userType || 'unknown'}`);
    }
    if (!this.accessToken || !this.refreshToken) {
      throw new Error(
        'Login did not return access and refresh tokens (expected JSON body or Set-Cookie headers).',
      );
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
    const url = `${this.config.platformApiUrl}/api/auth/refresh`;
    const { data, response } = await requestJsonWithResponse<LoginResponse>({
      url,
      method: 'POST',
      timeoutMs: this.config.requestTimeoutMs,
      retries: this.config.maxRetries,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        refresh_token: this.refreshToken,
      }),
    });

    const tokens = mergePlatformAuthTokensFromBodyAndCookies(data, response);
    this.accessToken = tokens.access_token;
    this.refreshToken = tokens.refresh_token;
    this.userType = data.user?.type ?? this.userType;
    if (!this.accessToken || !this.refreshToken) {
      throw new Error(
        'Refresh did not return access and refresh tokens (expected JSON body or Set-Cookie headers).',
      );
    }
  }
}
