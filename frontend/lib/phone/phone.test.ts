import {
  compactE164Phone,
  finalizePhoneFromRawInput,
  formatPhoneForDisplay,
  isLoginFieldPhoneLike,
  normalizeLoginFieldInput,
  sanitizePhoneInput,
  validatePhone,
} from './phone';

const en = {
  mustStartWithPlus: 'mustStartWithPlus',
  invalidCountry: 'invalidCountry',
  invalidLength: 'invalidLength',
  notMobile: 'notMobile',
};

function tMock(key: string): string {
  const map: Record<string, string> = {
    'phone.mustStartWithPlus': en.mustStartWithPlus,
    'phone.invalidCountry': en.invalidCountry,
    'phone.invalidLength': en.invalidLength,
    'phone.notMobile': en.notMobile,
  };
  return map[key] ?? key;
}

describe('isLoginFieldPhoneLike', () => {
  it('returns false when input contains @', () => {
    expect(isLoginFieldPhoneLike('a@b')).toBe(false);
    expect(isLoginFieldPhoneLike('+373@x')).toBe(false);
  });

  it('returns false for empty or whitespace-only', () => {
    expect(isLoginFieldPhoneLike('')).toBe(false);
    expect(isLoginFieldPhoneLike('   ')).toBe(false);
  });

  it('returns false when local email part has letters', () => {
    expect(isLoginFieldPhoneLike('john')).toBe(false);
    expect(isLoginFieldPhoneLike('user_name')).toBe(false);
  });

  it('returns true for digit-only and phone punctuation', () => {
    expect(isLoginFieldPhoneLike('069123456')).toBe(true);
    expect(isLoginFieldPhoneLike('+373 (69) 123-456')).toBe(true);
    expect(isLoginFieldPhoneLike('  +38265494949')).toBe(true);
  });
});

describe('normalizeLoginFieldInput', () => {
  it('leaves email-shaped input unchanged', () => {
    expect(normalizeLoginFieldInput('john@ex')).toBe('john@ex');
    expect(normalizeLoginFieldInput('name')).toBe('name');
  });

  it('sanitizes phone-like input like register field', () => {
    expect(normalizeLoginFieldInput('+373 (69) 123-456')).toBe('+37369123456');
    expect(normalizeLoginFieldInput('069123456')).toBe('+37369123456');
  });
});

describe('sanitizePhoneInput', () => {
  it('maps leading 0 to Moldova prefix', () => {
    expect(sanitizePhoneInput('069123456')).toBe('+37369123456');
  });

  it('converts 00 prefix to plus', () => {
    expect(sanitizePhoneInput('00373701234567')).toBe('+373701234567');
  });

  it('strips non-digit characters except plus', () => {
    expect(sanitizePhoneInput('+373 (69) 123-456')).toBe('+37369123456');
  });
});

describe('compactE164Phone', () => {
  it('returns E.164 for valid international input', () => {
    expect(compactE164Phone('+37369123456')).toBe('+37369123456');
  });
});

describe('formatPhoneForDisplay', () => {
  it('formats compact E.164 to Moldova XX XXX XXX display', () => {
    expect(formatPhoneForDisplay('+37369123456')).toBe('+373 69 123 456');
  });

  it('is idempotent for already formatted Moldova display', () => {
    expect(formatPhoneForDisplay('+373 69 123 456')).toBe('+373 69 123 456');
  });

  it('leaves non-parseable masked strings unchanged', () => {
    expect(formatPhoneForDisplay('+3736******456')).toBe('+3736******456');
  });

  it('formats listing-style masked phones (last digits as stars)', () => {
    expect(formatPhoneForDisplay('+37361111***')).toBe('+373 61 111 ***');
    expect(formatPhoneForDisplay('+49891234***')).toBe('+49 89 1234***');
  });

  it('formats masked phone that already had spaces before masking', () => {
    expect(formatPhoneForDisplay('+373 69 123 ***')).toBe('+373 69 123 ***');
  });

  it('leaves invalid input unchanged', () => {
    expect(formatPhoneForDisplay('not-a-phone')).toBe('not-a-phone');
  });

  it('returns empty for null or undefined', () => {
    expect(formatPhoneForDisplay(null)).toBe('');
    expect(formatPhoneForDisplay(undefined)).toBe('');
  });
});

describe('finalizePhoneFromRawInput', () => {
  it('returns empty phone and error for blank input', () => {
    expect(finalizePhoneFromRawInput('   ', tMock)).toEqual({ phone: '', error: '' });
  });

  it('returns formatted valid number and no error', () => {
    const r = finalizePhoneFromRawInput('+37369123456', tMock);
    expect(r.error).toBe('');
    expect(r.phone).toBe('+373 69 123 456');
  });

  it('returns validation error for invalid length after sanitize', () => {
    const r = finalizePhoneFromRawInput('+373691234', tMock);
    expect(r.error).toBe(en.invalidLength);
  });
});

describe('validatePhone', () => {
  it('accepts valid Moldova mobile', () => {
    expect(validatePhone('+37369123456', tMock)).toBe('');
  });

  it('accepts valid US mobile sample', () => {
    expect(validatePhone('+12025550123', tMock)).toBe('');
  });

  it('rejects invalid calling code when starts with plus', () => {
    const r = validatePhone('+9991234567', tMock);
    expect(r).toBe(en.invalidCountry);
  });

  it('rejects incorrect length for known country', () => {
    expect(validatePhone('+373691234', tMock)).toBe(en.invalidLength);
  });

  it('rejects garbage input', () => {
    const r = validatePhone('abc', tMock);
    expect(r).toBe(en.mustStartWithPlus);
  });
});

describe('phone (Albania)', () => {
  beforeEach(() => {
    process.env.COUNTRY = 'al';
    process.env.NEXT_PUBLIC_COUNTRY = 'al';
  });

  afterEach(() => {
    process.env.COUNTRY = 'md';
    process.env.NEXT_PUBLIC_COUNTRY = 'md';
  });

  it('prefixes local Albanian numbers with +355', () => {
    expect(sanitizePhoneInput('0691234567')).toBe('+355691234567');
    expect(compactE164Phone('+355691234567')).toBe('+355691234567');
    expect(formatPhoneForDisplay('+355691234567')).toBe('+355 69 123 4567');
  });
});
