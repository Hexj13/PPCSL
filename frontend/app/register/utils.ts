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

type AxiosErrorLike = {
  response?: {
    status?: number;
    data?: { message?: string | string[] };
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
  data: { message?: string | string[] } | undefined,
  t: (key: string) => string,
): string {
  const defaultMsg = t('register.phoneExists');
  if (status === 400) {
    if (data?.message) {
      return Array.isArray(data.message) ? data.message[0] || defaultMsg : data.message;
    }
    return t('register.phoneExists');
  }
  if (status === 404) return t('register.serviceUnavailable');
  if (status === 422) {
    if (data?.message) {
      return Array.isArray(data.message)
        ? data.message[0] || t('register.invalidPhoneFormat')
        : data.message;
    }
    return t('register.invalidPhoneFormat');
  }
  if (status && status >= 500) return t('register.serverError');
  return (
    (data?.message && (Array.isArray(data.message) ? data.message[0] : data.message)) ||
    t('register.phoneCheckError')
  );
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
