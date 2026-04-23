export { BACKEND_PHONE_ERROR_TO_I18N, getPhoneSubmitErrorMessage } from './backend-error-map';
export type { AxiosLikeWithPhoneError } from './backend-error-map';
export {
  compactE164Phone,
  finalizePhoneFromRawInput,
  formatPhoneForDisplay,
  formatPhoneOnBlur,
  isLoginFieldPhoneLike,
  normalizeLoginFieldInput,
  sanitizePhoneInput,
  validatePhone,
} from './phone';
