import type { AxiosRequestConfig } from 'axios';

import { api } from './api-client';
import type {
  ChangePasswordDto,
  ChangeEmailConfirmDto,
  ChangeEmailRequestDto,
  ChangePhoneRequestDto,
  ChangePhoneVerifyDto,
  GoogleSignInDto,
  GoogleSignInResponse,
  LoginDto,
  LoginResponse,
  RefreshTokenDto,
  RegisterDto,
  ResendEmailVerificationDto,
  RequestPasswordResetDto,
  ResetPasswordDto,
  SendSmsDto,
  UpdateProfileDto,
  UpdateProfileResponse,
  User,
  RegisterResponse,
  VerifyEmailDto,
  VerifyPhoneDto,
  VerifyResetCodeDto,
  VerifySmsDto,
} from './api-types';

const quietAuthHeaders = {
  'X-Skip-Auth-Redirect': 'true',
  'X-Skip-Error-Handling': 'true',
} as const;

export const authApi = {
  register: (data: RegisterDto, config?: AxiosRequestConfig) =>
    api.post<RegisterResponse>('/api/auth/register', data, config),
  login: (data: LoginDto, config?: AxiosRequestConfig) =>
    api.post<LoginResponse>('/api/auth/login', data, config),
  refresh: (data?: RefreshTokenDto) => api.post<LoginResponse>('/api/auth/refresh', data ?? {}),
  meQuiet: () => api.get<User>('/api/auth/me', { headers: { ...quietAuthHeaders } }),
  refreshQuiet: (data?: RefreshTokenDto) =>
    api.post<LoginResponse>('/api/auth/refresh', data ?? {}, { headers: { ...quietAuthHeaders } }),
  googleSignIn: (data: GoogleSignInDto) => api.post<GoogleSignInResponse>('/api/auth/google', data),
  logout: () => api.post<{ success: boolean }>('/api/auth/logout', {}),
  me: () => api.get<User>('/api/auth/me'),
  updateProfile: (data: UpdateProfileDto) =>
    api.patch<UpdateProfileResponse>('/api/auth/profile', data),
  changePassword: (data: ChangePasswordDto) =>
    api.post<{ success: boolean }>('/api/auth/change-password', data),
  deleteAccount: () => api.delete<{ success: boolean }>('/api/auth/profile'),
  verifyPhone: (data: VerifyPhoneDto) => api.post<LoginResponse>('/api/auth/verify-phone', data),
  sendSms: (data: SendSmsDto) =>
    api.post<{ success: boolean }>('/api/auth/send-sms', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  verifySms: (data: VerifySmsDto) =>
    api.post<{ success: boolean }>('/api/auth/verify-sms', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  verifyEmail: (data: VerifyEmailDto) =>
    api.post<{ success: boolean; user: User }>('/api/auth/verify-email', data),
  resendEmailVerification: (data: ResendEmailVerificationDto) =>
    api.post<{ success: boolean }>('/api/auth/resend-email-verification', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  requestPasswordReset: (data: RequestPasswordResetDto) =>
    api.post<{ success: boolean }>('/api/auth/request-password-reset', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  verifyResetCode: (data: VerifyResetCodeDto) =>
    api.post<{ success: boolean }>('/api/auth/verify-reset-code', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  resetPassword: (data: ResetPasswordDto) =>
    api.post<{ success: boolean; user: User }>('/api/auth/reset-password', data),
  changePhoneRequest: (data: ChangePhoneRequestDto) =>
    api.post<{ success: boolean }>('/api/auth/change-phone-request', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  changeEmailRequest: (data: ChangeEmailRequestDto) =>
    api.post<{ success: boolean }>('/api/auth/change-email-request', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  changeEmailConfirm: (data: ChangeEmailConfirmDto) =>
    api.post<{ success: boolean; user: User }>('/api/auth/change-email-confirm', data),
  changePhoneVerify: (data: ChangePhoneVerifyDto) =>
    api.post<User>('/api/auth/change-phone-verify', data, {
      headers: { 'X-Skip-Error-Handling': 'true' },
    }),
  dismissPartnerPromoBanner: () => api.post<User>('/api/auth/partner-promo/dismiss'),
};
