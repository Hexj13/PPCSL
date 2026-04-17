import { BadRequestException } from '@nestjs/common';

const MAX_PARTNER_LISTING_CANONICAL_URL_LENGTH = 2048;

export function normalizePartnerListingCanonicalUrlInput(
  raw: string | undefined | null,
): string | null {
  if (raw == null) {
    return null;
  }
  const t = String(raw).trim();
  return t.length > 0 ? t : null;
}

export function assertPartnerListingCanonicalUrlShape(url: string): void {
  if (url.length > MAX_PARTNER_LISTING_CANONICAL_URL_LENGTH) {
    throw new BadRequestException('errors.partnerListingCanonicalUrlInvalid');
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new BadRequestException('errors.partnerListingCanonicalUrlInvalid');
  }
  if (parsed.protocol !== 'https:') {
    throw new BadRequestException('errors.partnerListingCanonicalUrlInvalid');
  }
}
