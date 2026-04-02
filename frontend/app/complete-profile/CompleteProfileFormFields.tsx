import { Checkbox, HintTooltip } from '@/ui';

export interface CompleteProfileFormFieldsProps {
  isBusiness: boolean;
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    companyWebsiteUrl: string;
    additionalPhone: string;
    emailNotifications: boolean;
  };
  errors: {
    firstName: string;
    lastName: string;
    email: string;
    companyWebsiteUrl: string;
    additionalPhone: string;
  };
  touched: {
    firstName: boolean;
    lastName: boolean;
    email: boolean;
    companyWebsiteUrl: boolean;
    additionalPhone: boolean;
  };
  t: (key: string) => string;
  onFirstNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLastNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onEmailChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onCompanyWebsiteUrlChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdditionalPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFirstNameBlur: () => void;
  onLastNameBlur: () => void;
  onEmailBlur: () => void;
  onCompanyWebsiteUrlBlur: () => void;
  onAdditionalPhoneBlur: () => void;
  onFormFieldFocus: () => void;
  onEmailNotificationsChange: (checked: boolean) => void;
}

function CompleteProfileBusinessFormFields({
  formData,
  errors,
  touched,
  t,
  onEmailChange,
  onCompanyWebsiteUrlChange,
  onAdditionalPhoneChange,
  onEmailBlur,
  onCompanyWebsiteUrlBlur,
  onAdditionalPhoneBlur,
  onFormFieldFocus,
  onEmailNotificationsChange,
}: Pick<
  CompleteProfileFormFieldsProps,
  | 'formData'
  | 'errors'
  | 'touched'
  | 't'
  | 'onEmailChange'
  | 'onCompanyWebsiteUrlChange'
  | 'onAdditionalPhoneChange'
  | 'onEmailBlur'
  | 'onCompanyWebsiteUrlBlur'
  | 'onAdditionalPhoneBlur'
  | 'onFormFieldFocus'
  | 'onEmailNotificationsChange'
>) {
  return (
    <>
      <div>
        <label className="block text-sm font-semibold mb-2 text-primary-900">
          {t('profile.companyWebsiteUrl')}
        </label>
        <input
          type="url"
          value={formData.companyWebsiteUrl}
          onChange={onCompanyWebsiteUrlChange}
          onFocus={onFormFieldFocus}
          onBlur={onCompanyWebsiteUrlBlur}
          className={`input-field ${touched.companyWebsiteUrl && errors.companyWebsiteUrl ? 'border-red-500' : ''}`}
          placeholder={t('profile.companyWebsiteUrlPlaceholder')}
          autoComplete="url"
        />
        {touched.companyWebsiteUrl && errors.companyWebsiteUrl && (
          <p className="mt-1 text-sm text-red-400">{errors.companyWebsiteUrl}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-semibold mb-2 text-primary-900">
          {t('profile.additionalPhone')}
        </label>
        <input
          type="tel"
          value={formData.additionalPhone}
          onChange={onAdditionalPhoneChange}
          onFocus={onFormFieldFocus}
          onBlur={onAdditionalPhoneBlur}
          className={`input-field ${touched.additionalPhone && errors.additionalPhone ? 'border-red-500' : ''}`}
          placeholder={t('profile.additionalPhonePlaceholder')}
          autoComplete="tel"
        />
        {touched.additionalPhone && errors.additionalPhone && (
          <p className="mt-1 text-sm text-red-400">{errors.additionalPhone}</p>
        )}
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <label className="text-sm font-semibold text-primary-900">{t('register.email')}</label>
          <HintTooltip ariaLabel={t('register.emailHint')}>{t('register.emailHint')}</HintTooltip>
        </div>
        <input
          type="email"
          value={formData.email}
          onChange={onEmailChange}
          onFocus={onFormFieldFocus}
          onBlur={onEmailBlur}
          className={`input-field ${touched.email && errors.email ? 'border-red-500' : ''}`}
          placeholder={t('register.emailPlaceholder')}
          autoComplete="email"
        />
        {touched.email && errors.email && (
          <p className="mt-1 text-sm text-red-400">{errors.email}</p>
        )}
      </div>
      <Checkbox
        id="complete-profile-email-notifications"
        checked={formData.emailNotifications}
        onChange={(checked) => {
          onFormFieldFocus();
          onEmailNotificationsChange(checked);
        }}
        label={t('register.emailNotifications')}
        size="md"
      />
    </>
  );
}

export function CompleteProfileFormFields({
  isBusiness,
  formData,
  errors,
  touched,
  t,
  onFirstNameChange,
  onLastNameChange,
  onEmailChange,
  onCompanyWebsiteUrlChange,
  onAdditionalPhoneChange,
  onFirstNameBlur,
  onLastNameBlur,
  onEmailBlur,
  onCompanyWebsiteUrlBlur,
  onAdditionalPhoneBlur,
  onFormFieldFocus,
  onEmailNotificationsChange,
}: CompleteProfileFormFieldsProps) {
  if (isBusiness) {
    return (
      <CompleteProfileBusinessFormFields
        formData={formData}
        errors={errors}
        touched={touched}
        t={t}
        onEmailChange={onEmailChange}
        onCompanyWebsiteUrlChange={onCompanyWebsiteUrlChange}
        onAdditionalPhoneChange={onAdditionalPhoneChange}
        onEmailBlur={onEmailBlur}
        onCompanyWebsiteUrlBlur={onCompanyWebsiteUrlBlur}
        onAdditionalPhoneBlur={onAdditionalPhoneBlur}
        onFormFieldFocus={onFormFieldFocus}
        onEmailNotificationsChange={onEmailNotificationsChange}
      />
    );
  }
  return (
    <>
      <div>
        <label className="block text-sm font-semibold mb-2 text-primary-900">
          {t('register.firstName')}
        </label>
        <input
          type="text"
          value={formData.firstName}
          onChange={onFirstNameChange}
          onFocus={onFormFieldFocus}
          onBlur={onFirstNameBlur}
          className={`input-field ${touched.firstName && errors.firstName ? 'border-red-500' : ''}`}
          placeholder={t('register.firstName')}
          autoComplete="given-name"
        />
        {touched.firstName && errors.firstName && (
          <p className="mt-1 text-sm text-red-400">{errors.firstName}</p>
        )}
      </div>
      <div>
        <label className="block text-sm font-semibold mb-2 text-primary-900">
          {t('register.lastName')}
        </label>
        <input
          type="text"
          value={formData.lastName}
          onChange={onLastNameChange}
          onFocus={onFormFieldFocus}
          onBlur={onLastNameBlur}
          className={`input-field ${touched.lastName && errors.lastName ? 'border-red-500' : ''}`}
          placeholder={t('register.lastName')}
          autoComplete="family-name"
        />
        {touched.lastName && errors.lastName && (
          <p className="mt-1 text-sm text-red-400">{errors.lastName}</p>
        )}
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-2">
          <label className="text-sm font-semibold text-primary-900">{t('register.email')}</label>
          <HintTooltip ariaLabel={t('register.emailHint')}>{t('register.emailHint')}</HintTooltip>
        </div>
        <input
          type="email"
          value={formData.email}
          onChange={onEmailChange}
          onFocus={onFormFieldFocus}
          onBlur={onEmailBlur}
          className={`input-field ${touched.email && errors.email ? 'border-red-500' : ''}`}
          placeholder={t('register.emailPlaceholder')}
          autoComplete="email"
        />
        {touched.email && errors.email && (
          <p className="mt-1 text-sm text-red-400">{errors.email}</p>
        )}
      </div>
    </>
  );
}
