import { api } from './api-client';
import type {
  ChangePasswordDto,
  ChangeEmailConfirmDto,
  ChangeEmailRequestDto,
  ChangePhoneRequestDto,
  ChangePhoneVerifyDto,
  LoginDto,
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
  VerifyResetCodeDto,
  VerifySmsDto,
} from './api-types';

export const authApi = {
  register: (data: RegisterDto) => api.post<RegisterResponse>('/api/auth/register', data),
  login: (data: LoginDto) =>
    api.post<{ access_token: string; refresh_token: string; user: User }>('/api/auth/login', data),
  refresh: (data: RefreshTokenDto) =>
    api.post<{ access_token: string; refresh_token: string; user: User }>(
      '/api/auth/refresh',
      data,
    ),
  me: () => api.get<User>('/api/auth/me'),
  updateProfile: (data: UpdateProfileDto) =>
    api.patch<UpdateProfileResponse>('/api/auth/profile', data),
  changePassword: (data: ChangePasswordDto) =>
    api.post<{ success: boolean }>('/api/auth/change-password', data),
  deleteAccount: () => api.delete<{ success: boolean }>('/api/auth/profile'),
  verifyPhone: () => api.post<User>('/api/auth/verify-phone'),
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
};
