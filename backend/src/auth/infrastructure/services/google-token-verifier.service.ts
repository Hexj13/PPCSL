import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';

export type GoogleIdTokenProfile = {
  sub: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
};

@Injectable()
export class GoogleTokenVerifierService {
  private readonly client: OAuth2Client;

  constructor(private readonly configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client(clientId);
  }

  async verify(idToken: string): Promise<GoogleIdTokenProfile> {
    const audience = this.configService.get<string>('GOOGLE_CLIENT_ID');
    if (!audience) {
      throw new UnauthorizedException('errors.googleSignInFailed');
    }
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience,
      });
      const p = ticket.getPayload();
      if (!p?.sub || !p.email || p.email_verified !== true) {
        throw new UnauthorizedException('errors.googleEmailNotVerified');
      }
      return {
        sub: p.sub,
        email: p.email.toLowerCase().trim(),
        firstName: p.given_name ?? null,
        lastName: p.family_name ?? null,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('errors.googleSignInFailed');
    }
  }
}
