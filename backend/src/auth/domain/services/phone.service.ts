import { parsePhoneNumberFromString } from 'libphonenumber-js';

import { validatePhoneForSms } from '../../../common/utils/validate-phone-for-sms';

export class PhoneService {
  private static readonly MD_PREFIX = '+373';

  normalize(phone: string): string {
    let normalized = phone
      .trim()
      .replace(/\s+/g, '')
      .replace(/[()-]/g, '')
      .replace(/\u2010|\u2011|\u2012|\u2013|\u2014|\u2015/g, '');
    if (normalized.startsWith('00')) {
      normalized = '+' + normalized.slice(2);
    }

    const parsed = parsePhoneNumberFromString(normalized, 'MD');
    if (parsed?.isValid()) {
      return parsed.number;
    }

    if (normalized.startsWith('0')) {
      normalized = PhoneService.MD_PREFIX + normalized.substring(1);
    } else if (!normalized.startsWith('+')) {
      normalized = PhoneService.MD_PREFIX + normalized;
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
