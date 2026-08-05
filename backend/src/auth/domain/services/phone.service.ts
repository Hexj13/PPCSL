import { type CountryCode, parsePhoneNumberFromString } from 'libphonenumber-js';

import { getCountry } from '../../../common/env';
import { validatePhoneForSms } from '../../../common/utils/validate-phone-for-sms';

const CALLING_CODE_BY_COUNTRY: Record<string, { iso: CountryCode; prefix: string }> = {
  md: { iso: 'MD', prefix: '+373' },
  al: { iso: 'AL', prefix: '+355' },
};

export class PhoneService {
  private getRegion(): { iso: CountryCode; prefix: string } {
    return CALLING_CODE_BY_COUNTRY[getCountry()] ?? CALLING_CODE_BY_COUNTRY.md;
  }

  normalize(phone: string): string {
    const region = this.getRegion();
    let normalized = phone
      .trim()
      .replace(/\s+/g, '')
      .replace(/[()-]/g, '')
      .replace(/\u2010|\u2011|\u2012|\u2013|\u2014|\u2015/g, '');
    if (normalized.startsWith('00')) {
      normalized = '+' + normalized.slice(2);
    }

    const parsed = parsePhoneNumberFromString(normalized, region.iso);
    if (parsed?.isValid()) {
      return parsed.number;
    }

    if (normalized.startsWith('0')) {
      normalized = region.prefix + normalized.substring(1);
    } else if (!normalized.startsWith('+')) {
      normalized = region.prefix + normalized;
    }

    return normalized;
  }

  isValid(phone: string): boolean {
    return validatePhoneForSms(phone).ok;
  }

  equals(a: string, b: string): boolean {
    return this.normalize(a) === this.normalize(b);
  }
}
