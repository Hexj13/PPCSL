import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { IListingRepository, LISTING_REPOSITORY } from '../ports/listing.repository.port';
import {
  IReportUrlProvider,
  REPORT_URL_PROVIDER,
  ReportProviderLocale,
} from '../ports/report-url-provider.port';

function normalizeReportLocale(locale?: string): ReportProviderLocale {
  return locale?.trim().toLowerCase() === 'ru' ? 'ru' : 'ro';
}

@Injectable()
export class GetReportUrlUseCase {
  private readonly logger = new Logger(GetReportUrlUseCase.name);

  constructor(
    @Inject(LISTING_REPOSITORY)
    private readonly listingRepo: IListingRepository,
    @Inject(REPORT_URL_PROVIDER)
    private readonly reportUrlProvider: IReportUrlProvider,
  ) {}

  async execute(listingId: string, locale?: string): Promise<{ url: string }> {
    const listing = await this.listingRepo.findById(listingId);
    if (!listing) {
      throw new NotFoundException('errors.listingNotFound');
    }
    const vin = listing.vin?.trim();
    if (!vin) {
      throw new NotFoundException('errors.listingNotFound');
    }
    if (!this.reportUrlProvider.isEnabled()) {
      this.logger.warn('Report URL provider is not configured');
      throw new NotFoundException('errors.listingNotFound');
    }

    const normalizedLocale = normalizeReportLocale(locale);
    const url = await this.reportUrlProvider.generateUrl(vin, normalizedLocale);
    return { url };
  }

  isProviderEnabled(): boolean {
    return this.reportUrlProvider.isEnabled();
  }

  getFallbackUrl(locale?: string): string {
    const normalizedLocale = normalizeReportLocale(locale);
    return this.reportUrlProvider.getFallbackUrl(normalizedLocale);
  }
}
