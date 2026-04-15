import * as crypto from 'crypto';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  IReportUrlProvider,
  ReportProviderLocale,
} from '../application/ports/report-url-provider.port';

function base64urlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encryptVin(vin: string, secretKey: string): string {
  const normalizedVin = vin.trim();
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(normalizedVin, 'utf8'), cipher.final()]);
  return base64urlEncode(Buffer.concat([iv, encrypted]));
}

@Injectable()
export class InfocarReportUrlProvider implements IReportUrlProvider {
  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    return Boolean(
      this.getSecretKey() &&
      this.getPartnerFrom() &&
      this.getBaseUrl('ro') &&
      this.getBaseUrl('ru'),
    );
  }

  async generateUrl(vin: string, locale: ReportProviderLocale): Promise<string> {
    const secretKey = this.getSecretKey();
    const baseUrl = this.getConfiguredBaseUrl(locale);
    if (!secretKey || !baseUrl) {
      throw new Error('Report provider is not configured');
    }

    const encodedVin = encryptVin(vin, secretKey);
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}vin=${encodeURIComponent(encodedVin)}`;
  }

  getFallbackUrl(locale: ReportProviderLocale): string {
    return this.getConfiguredBaseUrl(locale);
  }

  private getConfiguredBaseUrl(locale: ReportProviderLocale): string {
    const baseUrl = this.getBaseUrl(locale);
    const partnerFrom = this.getPartnerFrom();
    if (!baseUrl || !partnerFrom) {
      return '';
    }

    if (baseUrl.includes('from=')) {
      return baseUrl;
    }

    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}from=${encodeURIComponent(partnerFrom)}`;
  }

  private getBaseUrl(locale: ReportProviderLocale): string {
    const value =
      locale === 'ru'
        ? this.getEnvValue('REPORT_PROVIDER_BASE_URL_RU', 'INFOCAR_BASE_URL_RU')
        : this.getEnvValue('REPORT_PROVIDER_BASE_URL', 'INFOCAR_BASE_URL');
    return value?.trim() || '';
  }

  private getSecretKey(): string {
    return this.getEnvValue('REPORT_PROVIDER_SECRET_KEY', 'INFOCAR_SECRET_KEY')?.trim() || '';
  }

  private getPartnerFrom(): string {
    return this.getEnvValue('REPORT_PROVIDER_PARTNER_FROM', 'INFOCAR_PARTNER_FROM')?.trim() || '';
  }

  private getEnvValue(primaryKey: string, legacyKey: string): string | undefined {
    return this.configService.get<string>(primaryKey) ?? this.configService.get<string>(legacyKey);
  }
}
