export const SMS_TEST_CODE = '000000';

export function isSmsTestCodeAllowed(
  nodeEnv: string | undefined,
  allowSmsTestCode: string | undefined,
): boolean {
  if (nodeEnv === 'production') {
    return false;
  }
  if (nodeEnv === 'development' || nodeEnv === 'stage') {
    return true;
  }
  if (nodeEnv === 'test') {
    return allowSmsTestCode === 'true' || allowSmsTestCode === '1';
  }
  return false;
}
