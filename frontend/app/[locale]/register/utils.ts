import { getPhoneSubmitErrorMessage, validatePhone as validatePhoneLib } from '@/lib/phone';

export function validatePhone(phone: string, t: (key: string) => string): string {
  return validatePhoneLib(phone, t);
}

export function getRegisterSubmitErrorMessage(
  axiosError: Parameters<typeof getPhoneSubmitErrorMessage>[0],
  t: (key: string) => string,
): string {
  return getPhoneSubmitErrorMessage(axiosError, t);
}
