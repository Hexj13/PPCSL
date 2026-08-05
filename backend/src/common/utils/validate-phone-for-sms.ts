import { type CountryCode, parsePhoneNumberFromString, type NumberType } from 'libphonenumber-js';

import { getCountry } from '../env';

const DEFAULT_COUNTRY_BY_PLATFORM: Record<string, CountryCode> = {
  md: 'MD',
  al: 'AL',
};

const MOBILE_SMS_TYPES: Set<NumberType> = new Set(['MOBILE', 'FIXED_LINE_OR_MOBILE']);

export const PHONE_SMS_ERROR_KEYS = {
  mustStartWithPlus: 'validation.phoneMustStartWithPlus',
  invalidCountry: 'validation.phoneInvalidCountry',
  invalidLength: 'validation.phoneInvalidLength',
  notMobile: 'validation.phoneNotMobile',
  generic: 'validation.phone',
} as const;

function isSmsCapableLineType(type: NumberType | undefined): boolean {
  if (type === undefined) {
    return true;
  }
  return MOBILE_SMS_TYPES.has(type);
}

function getDefaultCountry(): CountryCode {
  return DEFAULT_COUNTRY_BY_PLATFORM[getCountry()] ?? 'MD';
}

export type PhoneSmsValidation = { ok: true } | { ok: false; errorKey: string };

export function validatePhoneForSms(raw: string): PhoneSmsValidation {
  const value = typeof raw === 'string' ? raw.trim() : '';
  const parsed = parsePhoneNumberFromString(value, getDefaultCountry());
  if (!parsed) {
    return {
      ok: false,
      errorKey: value.startsWith('+')
        ? PHONE_SMS_ERROR_KEYS.invalidCountry
        : PHONE_SMS_ERROR_KEYS.mustStartWithPlus,
    };
  }
  if (!parsed.isValid()) {
    return {
      ok: false,
      errorKey: parsed.country
        ? PHONE_SMS_ERROR_KEYS.invalidLength
        : PHONE_SMS_ERROR_KEYS.invalidCountry,
    };
  }
  const lineType = parsed.getType();
  if (!isSmsCapableLineType(lineType)) {
    return { ok: false, errorKey: PHONE_SMS_ERROR_KEYS.notMobile };
  }
  return { ok: true };
}
