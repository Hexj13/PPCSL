import { createHmac } from 'crypto';

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const FACEBOOK_GRAPH_API = 'https://graph.facebook.com/v21.0';
const FACEBOOK_GRAPH_TIMEOUT_MS = 5_000;

export type FacebookAccessTokenProfile = {
  sub: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

type DebugTokenResponse = {
  data?: {
    app_id?: string;
    is_valid?: boolean;
    user_id?: string;
  };
};

type MeResponse = {
  id?: string;
  email?: string;
  first_name?: string;
  last_name?: string;
};

@Injectable()
export class FacebookTokenVerifierService {
  constructor(private readonly configService: ConfigService) {}

  private async fetchJson<T>(url: URL, accessToken: string): Promise<T> {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(FACEBOOK_GRAPH_TIMEOUT_MS),
      });
      if (!response.ok) {
        throw new UnauthorizedException('errors.facebookSignInFailed');
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('errors.facebookSignInFailed');
    }
  }

  async verify(accessToken: string): Promise<FacebookAccessTokenProfile> {
    const appId = this.configService.get<string>('FACEBOOK_APP_ID')?.trim();
    const appSecret = this.configService.get<string>('FACEBOOK_APP_SECRET')?.trim();
    if (!appId || !appSecret) {
      throw new UnauthorizedException('errors.facebookSignInFailed');
    }

    const appAccessToken = `${appId}|${appSecret}`;
    const debugUrl = new URL(`${FACEBOOK_GRAPH_API}/debug_token`);
    debugUrl.searchParams.set('input_token', accessToken);
    const debugJson = await this.fetchJson<DebugTokenResponse>(debugUrl, appAccessToken);

    const debug = debugJson.data;
    if (!debug?.is_valid || debug.app_id !== appId || !debug.user_id) {
      throw new UnauthorizedException('errors.facebookSignInFailed');
    }

    const appsecretProof = createHmac('sha256', appSecret).update(accessToken).digest('hex');
    const meUrl = new URL(`${FACEBOOK_GRAPH_API}/me`);
    meUrl.searchParams.set('fields', 'id,email,first_name,last_name');
    meUrl.searchParams.set('appsecret_proof', appsecretProof);
    const me = await this.fetchJson<MeResponse>(meUrl, accessToken);

    if (!me.id || me.id !== debug.user_id) {
      throw new UnauthorizedException('errors.facebookSignInFailed');
    }

    const email = me.email?.trim().toLowerCase();
    if (!email) {
      throw new UnauthorizedException('errors.facebookEmailRequired');
    }

    return {
      sub: me.id,
      email,
      firstName: me.first_name ?? null,
      lastName: me.last_name ?? null,
    };
  }
}
