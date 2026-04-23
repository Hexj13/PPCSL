export const BACKEND_PHONE_ERROR_TO_I18N: Record<string, string> = {
  'validation.phone': 'phone.invalidLength',
  'validation.phoneMustStartWithPlus': 'phone.mustStartWithPlus',
  'validation.phoneInvalidCountry': 'phone.invalidCountry',
  'validation.phoneInvalidLength': 'phone.invalidLength',
  'validation.phoneNotMobile': 'phone.notMobile',
  'errors.phoneAlreadyExists': 'register.phoneExists',
};

export type AxiosLikeWithPhoneError = {
  response?: {
    status?: number;
    data?: { message?: string | string[]; errorKey?: string };
  };
  message?: string;
  code?: string;
};

export function getPhoneSubmitErrorMessage(
  axiosError: AxiosLikeWithPhoneError,
  t: (key: string) => string,
): string {
  if (!axiosError.response) {
    if (
      axiosError.message?.includes('Network') ||
      axiosError.message?.includes('timeout') ||
      axiosError.code === 'ERR_NETWORK'
    ) {
      return t('register.networkError');
    }
    if (axiosError.message?.includes('Cannot POST') || axiosError.message?.includes('404')) {
      return t('register.phoneServiceUnavailable');
    }
    return t('register.phoneCheckError');
  }
  const { status, data } = axiosError.response;
  const frontendKey =
    data?.errorKey !== undefined ? BACKEND_PHONE_ERROR_TO_I18N[data.errorKey] : undefined;
  if (frontendKey) {
    return t(frontendKey);
  }
  if (status === 400 || status === 422) {
    return t('register.phoneInvalid');
  }
  if (status === 404) {
    return t('register.serviceUnavailable');
  }
  if (status !== undefined && status >= 500) {
    return t('register.serverError');
  }
  return t('register.phoneCheckError');
}
