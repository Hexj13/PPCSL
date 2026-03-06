export function validatePhone(phone: string, t: (key: string) => string): string {
  if (!phone) return '';
  if (!phone.startsWith('+')) return t('register.phoneMustStartWithPlus');
  const phoneWithoutPlus = phone.substring(1);
  if (phoneWithoutPlus.length < 7 || phoneWithoutPlus.length > 19) return t('register.phoneLength');
  if (!/^\d+$/.test(phoneWithoutPlus)) return t('register.phoneDigitsOnly');
  const countryCodeMatch = phoneWithoutPlus.match(/^(\d{1,4})(\d{6,15})$/);
  if (!countryCodeMatch) return t('register.phoneFormat');
  const [, countryCode, number] = countryCodeMatch;
  if (countryCode.length < 1 || countryCode.length > 4) return t('register.countryCodeLength');
  if (number.length < 6 || number.length > 15) return t('register.numberLength');
  return '';
}

const BACKEND_ERROR_KEY_TO_FRONTEND: Record<string, string> = {
  'validation.phone': 'register.phoneFormat',
  'errors.phoneAlreadyExists': 'register.phoneExists',
};

type AxiosErrorLike = {
  response?: {
    status?: number;
    data?: { message?: string | string[]; errorKey?: string };
  };
  message?: string;
  code?: string;
};

function getMessageFromNetworkError(
  axiosError: AxiosErrorLike,
  t: (key: string) => string,
): string {
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
  return t('register.phoneExists');
}

function getMessageFromResponse(
  status: number | undefined,
  data: { message?: string | string[]; errorKey?: string } | undefined,
  t: (key: string) => string,
): string {
  const frontendKey = data?.errorKey && BACKEND_ERROR_KEY_TO_FRONTEND[data.errorKey];
  if (frontendKey) {
    return t(frontendKey);
  }
  if (status === 400) {
    return t('register.phoneFormat');
  }
  if (status === 404) return t('register.serviceUnavailable');
  if (status === 422) return t('register.phoneFormat');
  if (status && status >= 500) return t('register.serverError');
  return t('register.phoneCheckError');
}

export function getRegisterSubmitErrorMessage(
  axiosError: AxiosErrorLike,
  t: (key: string) => string,
): string {
  if (!axiosError.response) {
    return getMessageFromNetworkError(axiosError, t);
  }
  return getMessageFromResponse(axiosError.response.status, axiosError.response.data, t);
}
