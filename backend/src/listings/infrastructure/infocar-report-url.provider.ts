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

const DEFAULT_REPORT_BASE: Record<ReportProviderLocale, string> = {
  ro: 'https://infocar.md',
  ru: 'https://ru.infocar.md',
};

const DEFAULT_PARTNER_FROM = 'kupito';
const DEFAULT_PARTNER_PARAM = 'from';

function encryptVin(vin: string, secretKey: string): string {
  const normalizedVin = vin.trim();
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(normalizedVin, 'utf8'), cipher.final()]);
  return base64urlEncode(Buffer.concat([iv, encrypted]));
}

function appendQueryParam(url: string, key: string, value: string): string {
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
}

@Injectable()
export class InfocarReportUrlProvider implements IReportUrlProvider {
  constructor(private readonly configService: ConfigService) {}

  isEnabled(): boolean {
    if (this.getSecretKey()) {
      return Boolean(this.getPartnerFrom());
    }

    return Boolean(this.getBaseUrl('ro') || this.getBaseUrl('ru'));
  }

  async generateUrl(vin: string, locale: ReportProviderLocale): Promise<string> {
    const baseUrl = this.getConfiguredBaseUrl(locale);
    if (!baseUrl) {
      throw new Error('Report provider is not configured');
    }

    const secretKey = this.getSecretKey();
    const vinValue = secretKey ? encryptVin(vin, secretKey) : vin.trim();
    return appendQueryParam(baseUrl, 'vin', vinValue);
  }

  getFallbackUrl(locale: ReportProviderLocale): string {
    return this.getConfiguredBaseUrl(locale);
  }

  private getConfiguredBaseUrl(locale: ReportProviderLocale): string {
    const explicitBase = this.getBaseUrl(locale);
    const baseUrl = explicitBase || (this.getSecretKey() ? DEFAULT_REPORT_BASE[locale] : '');
    if (!baseUrl) {
      return '';
    }

    const partnerParam = this.getPartnerParam();
    const partnerFrom = this.getPartnerFrom() || (explicitBase ? '' : DEFAULT_PARTNER_FROM);
    if (!partnerFrom) {
      return baseUrl;
    }

    if (baseUrl.includes(`${partnerParam}=`)) {
      return baseUrl;
    }

    return appendQueryParam(baseUrl, partnerParam, partnerFrom);
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

  private getPartnerParam(): string {
    return (
      this.configService.get<string>('REPORT_PROVIDER_PARTNER_PARAM')?.trim() ||
      DEFAULT_PARTNER_PARAM
    );
  }

  private getEnvValue(primaryKey: string, legacyKey: string): string | undefined {
    return this.configService.get<string>(primaryKey) ?? this.configService.get<string>(legacyKey);
  }
}
