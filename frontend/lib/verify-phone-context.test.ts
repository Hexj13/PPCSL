import {
  VERIFY_PHONE_MODE_POST_REGISTER,
  buildVerifyPhoneSearchParams,
  clearVerifyPhoneContext,
  loadVerifyPhoneContext,
  saveVerifyPhoneContext,
} from './verify-phone-context';

describe('verify-phone-context', () => {
  beforeEach(() => {
    sessionStorage.clear();
    clearVerifyPhoneContext();
  });

  it('stores and loads phone without putting it in URL params', () => {
    saveVerifyPhoneContext({ phone: '+37360123456', mode: 'complete-profile' });
    expect(loadVerifyPhoneContext()).toEqual({
      phone: '+37360123456',
      mode: 'complete-profile',
    });
    const query = buildVerifyPhoneSearchParams({
      mode: 'complete-profile',
      returnUrl: '/ro',
    });
    expect(query).not.toContain('phone');
    expect(query).toContain('mode=complete-profile');
  });

  it('supports reserved post-register mode without phone in query', () => {
    const query = buildVerifyPhoneSearchParams({ mode: VERIFY_PHONE_MODE_POST_REGISTER });
    expect(query).toBe('mode=post-register');
    expect(query).not.toContain('phone');
  });
});
