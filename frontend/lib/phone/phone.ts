import { type NumberType, parsePhoneNumberFromString, type PhoneNumber } from 'libphonenumber-js';

const DEFAULT_CC = 'MD';

const MD_CALLING_CODE = '373';
const MD_NATIONAL_DIGITS = 8;

const SMS_LINE_TYPES = new Set<NumberType>(['MOBILE', 'FIXED_LINE_OR_MOBILE']);

function formatMdInternational(parsed: PhoneNumber): string | null {
  if (parsed.country !== 'MD' || parsed.countryCallingCode !== MD_CALLING_CODE) {
    return null;
  }
  const nn = String(parsed.nationalNumber);
  if (nn.length !== MD_NATIONAL_DIGITS) {
    return null;
  }
  return `+${MD_CALLING_CODE} ${nn.slice(0, 2)} ${nn.slice(2, 5)} ${nn.slice(5, 8)}`;
}

export function sanitizePhoneInput(raw: string): string {
  if (raw === '') {
    return '';
  }
  let value = raw.replace(/[^\d+]/g, '');
  const plusCount = (value.match(/\+/g) || []).length;
  if (plusCount > 1) {
    value = '+' + value.replace(/\+/g, '');
  }

  if (value.length > 0 && value[0] !== '+') {
    if (value.startsWith('00')) {
      value = '+' + value.slice(2);
    } else if (value.startsWith('0')) {
      value = '+373' + value.substring(1);
    } else {
      value = '+' + value.replace(/\+/g, '');
    }
  } else if (value.startsWith('+0')) {
    value = '+373' + value.substring(2);
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
  const parsed = parsePhoneNumberFromString(trimmed, DEFAULT_CC);
  if (!parsed?.isValid()) {
    return trimmed;
  }
  return formatMdInternational(parsed) ?? parsed.formatInternational();
}

export function formatPhoneForDisplay(raw: string | null | undefined): string {
  if (!raw) {
    return '';
  }
  const trimmed = raw.trim();
  const starCount = (trimmed.match(/\*/g) || []).length;
  if (starCount > 0) {
    const synthetic = trimmed.replace(/\s/g, '').replace(/\*/g, '0');
    const maskedParsed = parsePhoneNumberFromString(synthetic, DEFAULT_CC);
    if (!maskedParsed?.isValid()) {
      return trimmed;
    }
    const fullDisplay = formatMdInternational(maskedParsed) ?? maskedParsed.formatInternational();
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
  const parsed = parsePhoneNumberFromString(trimmed, DEFAULT_CC);
  if (parsed?.isValid()) {
    return formatMdInternational(parsed) ?? parsed.formatInternational();
  }
  return raw;
}

export function compactE164Phone(raw: string): string {
  const cleaned = raw.replace(/\s/g, '').trim();
  const parsed = parsePhoneNumberFromString(cleaned, DEFAULT_CC);
  if (parsed?.isValid()) {
    return parsed.number;
  }
  return cleaned;
}

export function validatePhone(phone: string, t: (key: string) => string): string {
  if (!phone) {
    return '';
  }
  const trimmed = phone.trim();
  const parsed = parsePhoneNumberFromString(trimmed, DEFAULT_CC);
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
