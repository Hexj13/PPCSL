import {
  validateAdminEditUserForm,
  type AdminEditUserFormState,
} from './adminEditUserFormValidation';

const t = (key: string): string => key;

function baseForm(overrides: Partial<AdminEditUserFormState> = {}): AdminEditUserFormState {
  return {
    email: 'a@b.co',
    emailVerified: false,
    firstName: 'Jane',
    lastName: 'Doe',
    companyName: 'Acme',
    companyWebsiteUrl: 'https://example.com',
    additionalPhone: '',
    isPlatformPartner: false,
    freePromotionBalance: '0',
    ...overrides,
  };
}

describe('validateAdminEditUserForm', () => {
  it('returns valid for individual when email and optional names are acceptable', () => {
    const r = validateAdminEditUserForm({
      business: false,
      primaryPhone: null,
      form: baseForm({ email: 'ok@example.com', firstName: '', lastName: '' }),
      t,
    });
    expect(r.valid).toBe(true);
    expect(r.fieldMessages).toEqual({});
  });

  it('flags invalid email for individual', () => {
    const r = validateAdminEditUserForm({
      business: false,
      primaryPhone: null,
      form: baseForm({ email: 'not-an-email' }),
      t,
    });
    expect(r.valid).toBe(false);
    expect(r.fieldMessages.email).toBe('profile.invalidEmail');
    expect(r.firstToastMessage).toBe('profile.invalidEmail');
  });

  it('flags first name that is too short when non-empty', () => {
    const r = validateAdminEditUserForm({
      business: false,
      primaryPhone: null,
      form: baseForm({ firstName: 'J' }),
      t,
    });
    expect(r.valid).toBe(false);
    expect(r.fieldMessages.firstName).toBe('register.firstNameMinLength');
  });

  it('flags invalid company website URL for business', () => {
    const r = validateAdminEditUserForm({
      business: true,
      primaryPhone: '+12345678901',
      form: baseForm({
        companyWebsiteUrl: 'ftp://bad',
        isPlatformPartner: false,
        freePromotionBalance: '0',
      }),
      t,
    });
    expect(r.valid).toBe(false);
    expect(r.fieldMessages.companyWebsiteUrl).toBe('profile.invalidCompanyWebsiteUrl');
  });

  it('flags empty partner balance when partner is enabled', () => {
    const r = validateAdminEditUserForm({
      business: true,
      primaryPhone: '+12345678901',
      form: baseForm({
        isPlatformPartner: true,
        freePromotionBalance: '',
      }),
      t,
    });
    expect(r.valid).toBe(false);
    expect(r.fieldMessages.freePromotionBalance).toBe('admin.usersTab.freePromotionBalanceInvalid');
  });

  it('flags non-integer partner balance string', () => {
    const r = validateAdminEditUserForm({
      business: true,
      primaryPhone: '+12345678901',
      form: baseForm({
        isPlatformPartner: true,
        freePromotionBalance: '12.4',
      }),
      t,
    });
    expect(r.valid).toBe(false);
    expect(r.fieldMessages.freePromotionBalance).toBe('admin.usersTab.freePromotionBalanceInvalid');
  });
});
