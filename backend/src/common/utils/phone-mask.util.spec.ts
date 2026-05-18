import { maskPhoneLastDigits } from './phone-mask.util';

describe('maskPhoneLastDigits', () => {
  it('masks last three digits skipping non-digits', () => {
    expect(maskPhoneLastDigits('+373 69 123 456')).toBe('+373 69 123 ***');
  });

  it('handles fewer than three digits', () => {
    expect(maskPhoneLastDigits('+12a34')).toBe('+1*a**');
  });

  it('returns empty unchanged', () => {
    expect(maskPhoneLastDigits('')).toBe('');
  });
});
