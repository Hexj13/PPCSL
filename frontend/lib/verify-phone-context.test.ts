import {
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
});
