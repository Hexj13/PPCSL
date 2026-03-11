import * as crypto from 'crypto';

import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';

const INFOCAR_BASE_URL = 'https://infocar.md';
const INFOCAR_PARTNER_FROM = 'kupito';

function base64urlEncode(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function encryptVin(vin: string, secretKey: string): string {
  const vinNormalized = vin.trim();
  const key = crypto.createHash('sha256').update(secretKey).digest();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  const encrypted = Buffer.concat([cipher.update(vinNormalized, 'utf8'), cipher.final()]);
  return base64urlEncode(Buffer.concat([iv, encrypted]));
}

@Injectable()
export class GetReportUrlUseCase {
  private readonly logger = new Logger(GetReportUrlUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(listingId: string): Promise<{ url: string }> {
    const listing = await this.listingRepo.findById(listingId);
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }
    const vin = listing.vin?.trim();
    if (!vin) {
      throw new NotFoundException('errors.listingNotFound');
    }
    const secretKey = this.configService.get<string>('INFOCAR_SECRET_KEY');
    if (!secretKey) {
      this.logger.warn('INFOCAR_SECRET_KEY not set, cannot generate report URL');
      throw new NotFoundException('errors.listingNotFound');
    }
    const encoded = encryptVin(vin, secretKey);
    const baseUrl = this.configService.get<string>('INFOCAR_BASE_URL') || INFOCAR_BASE_URL;
    const from = this.configService.get<string>('INFOCAR_PARTNER_FROM') || INFOCAR_PARTNER_FROM;
    const separator = baseUrl.includes('?') ? '&' : '?';
    const url = `${baseUrl}${separator}from=${encodeURIComponent(from)}&vin_enc=${encodeURIComponent(encoded)}`;
    return { url };
  }
}
