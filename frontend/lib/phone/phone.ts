import {
  type CountryCode,
  type NumberType,
  parsePhoneNumberFromString,
  type PhoneNumber,
} from 'libphonenumber-js';

import { getCountry } from '@/lib/utils';

type PhoneRegion = {
  iso: CountryCode;
  callingCode: string;
  nationalDigits: number;
  /** National groups after calling code, e.g. [2,3,3] → +373 69 123 456 */
  displayGroups: number[];
};

const PHONE_REGIONS: Record<string, PhoneRegion> = {
  md: { iso: 'MD', callingCode: '373', nationalDigits: 8, displayGroups: [2, 3, 3] },
  al: { iso: 'AL', callingCode: '355', nationalDigits: 9, displayGroups: [2, 3, 4] },
};

const SMS_LINE_TYPES = new Set<NumberType>(['MOBILE', 'FIXED_LINE_OR_MOBILE']);

function getPhoneRegion(): PhoneRegion {
  return PHONE_REGIONS[getCountry()] ?? PHONE_REGIONS.md;
}

function formatRegionalInternational(parsed: PhoneNumber, region: PhoneRegion): string | null {
  if (parsed.country !== region.iso || parsed.countryCallingCode !== region.callingCode) {
    return null;
  }
  const nn = String(parsed.nationalNumber);
  if (nn.length !== region.nationalDigits) {
    return null;
  }
  const parts: string[] = [];
  let offset = 0;
  for (const size of region.displayGroups) {
    parts.push(nn.slice(offset, offset + size));
    offset += size;
  }
  return `+${region.callingCode} ${parts.join(' ')}`;
}

export function sanitizePhoneInput(raw: string): string {
  if (raw === '') {
    return '';
  }
  const region = getPhoneRegion();
  let value = raw.replace(/[^\d+]/g, '');
  const plusCount = (value.match(/\+/g) || []).length;
  if (plusCount > 1) {
    value = '+' + value.replace(/\+/g, '');
  }

  if (value.length > 0 && value[0] !== '+') {
    if (value.startsWith('00')) {
      value = '+' + value.slice(2);
    } else if (value.startsWith('0')) {
      value = `+${region.callingCode}` + value.substring(1);
    } else {
      value = '+' + value.replace(/\+/g, '');
    }
  } else if (value.startsWith('+0')) {
    value = `+${region.callingCode}` + value.substring(2);
  }

  if (value.length > 20) {
    value = value.slice(0, 20);
  }
  return value;
}

export function isLoginFieldPhoneLike(raw: string): boolean {
  if (raw.includes('@')) {
    return false;
  }
  const s = raw.trimStart();
  if (!s) {
    return false;
  }
  return /^[\d+\s()-]*$/.test(s) && /\d/.test(s);
}

export function normalizeLoginFieldInput(raw: string): string {
  if (!isLoginFieldPhoneLike(raw)) {
    return raw;
  }
  return sanitizePhoneInput(raw);
}

export function formatPhoneOnBlur(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    return '';
  }
  const region = getPhoneRegion();
  const parsed = parsePhoneNumberFromString(trimmed, region.iso);
  if (!parsed?.isValid()) {
    return trimmed;
  }
  return formatRegionalInternational(parsed, region) ?? parsed.formatInternational();
}

export function formatPhoneForDisplay(raw: string | null | undefined): string {
  if (!raw) {
    return '';
  }
  const region = getPhoneRegion();
  const trimmed = raw.trim();
  const starCount = (trimmed.match(/\*/g) || []).length;
  if (starCount > 0) {
    const synthetic = trimmed.replace(/\s/g, '').replace(/\*/g, '0');
    const maskedParsed = parsePhoneNumberFromString(synthetic, region.iso);
    if (!maskedParsed?.isValid()) {
      return trimmed;
    }
    const fullDisplay =
      formatRegionalInternational(maskedParsed, region) ?? maskedParsed.formatInternational();
    let replaced = 0;
    const chars = [...fullDisplay];
    for (let i = chars.length - 1; i >= 0 && replaced < starCount; i -= 1) {
      if (/\d/.test(chars[i])) {
        chars[i] = '*';
        replaced += 1;
      }
    }
    return chars.join('');
  }
  const parsed = parsePhoneNumberFromString(trimmed, region.iso);
  if (parsed?.isValid()) {
    return formatRegionalInternational(parsed, region) ?? parsed.formatInternational();
  }
  return raw;
}

export function compactE164Phone(raw: string): string {
  const region = getPhoneRegion();
  const cleaned = raw.replace(/\s/g, '').trim();
  const parsed = parsePhoneNumberFromString(cleaned, region.iso);
  if (parsed?.isValid()) {
    return parsed.number;
  }
  return cleaned;
}

export function validatePhone(phone: string, t: (key: string) => string): string {
  if (!phone) {
    return '';
  }
  const region = getPhoneRegion();
  const trimmed = phone.trim();
  const parsed = parsePhoneNumberFromString(trimmed, region.iso);
  if (!parsed) {
    return trimmed.startsWith('+') ? t('phone.invalidCountry') : t('phone.mustStartWithPlus');
  }
  if (!parsed.isValid()) {
    return parsed.country ? t('phone.invalidLength') : t('phone.invalidCountry');
  }
  const lineType = parsed.getType();
  if (lineType !== undefined && !SMS_LINE_TYPES.has(lineType)) {
    return t('phone.notMobile');
  }
  return '';
}

export function finalizePhoneFromRawInput(
  raw: string,
  t: (key: string) => string,
): { phone: string; error: string } {
  if (!raw.trim()) {
    return { phone: '', error: '' };
  }
  const sanitized = sanitizePhoneInput(raw);
  const formatted = formatPhoneOnBlur(sanitized);
  return { phone: formatted, error: validatePhone(formatted, t) };
}
