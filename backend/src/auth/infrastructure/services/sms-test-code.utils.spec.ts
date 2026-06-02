import { isSmsTestCodeAllowed, SMS_TEST_CODE } from './sms-test-code.utils';

describe('sms-test-code.utils', () => {
  describe('isSmsTestCodeAllowed', () => {
    it('returns false for development and stage without test flag', () => {
      expect(isSmsTestCodeAllowed('development', undefined)).toBe(false);
      expect(isSmsTestCodeAllowed('stage', undefined)).toBe(false);
    });

    it('returns true for test env only with explicit flag', () => {
      expect(isSmsTestCodeAllowed('test', 'true')).toBe(true);
      expect(isSmsTestCodeAllowed('test', '1')).toBe(true);
    });

    it('returns false for production and test without flag', () => {
      expect(isSmsTestCodeAllowed('production', 'true')).toBe(false);
      expect(isSmsTestCodeAllowed('test', undefined)).toBe(false);
      expect(isSmsTestCodeAllowed('test', 'false')).toBe(false);
    });
  });

  it('exports fixed test code constant', () => {
    expect(SMS_TEST_CODE).toBe('000000');
  });
});
