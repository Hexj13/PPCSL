'use client';

import { RegisterFormCompanyField } from './RegisterFormCompanyField';
import { RegisterFormMessengers } from './RegisterFormMessengers';
import { RegisterFormPassword } from './RegisterFormPassword';
import { RegisterFormPhoneField } from './RegisterFormPhoneField';
import type { RegisterFormState } from './useRegisterPage';

type RegisterFormFieldsProps = {
  formData: RegisterFormState;
  setFormData: React.Dispatch<React.SetStateAction<RegisterFormState>>;
  phoneError: string;
  phoneTouched: boolean;
  passwordError: string;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  getPasswordValidationRules: (password: string) => { text: string; isValid: boolean }[];
  onPhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPhoneBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
  onPasswordChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFormFieldFocus: () => void;
};

export function RegisterFormFields({
  formData,
  setFormData,
  phoneError,
  phoneTouched,
  passwordError,
  showPassword,
  setShowPassword,
  getPasswordValidationRules,
  onPhoneChange,
  onPhoneBlur,
  onPasswordChange,
  onFormFieldFocus,
}: RegisterFormFieldsProps) {
  const phoneField = (
    <RegisterFormPhoneField
      value={formData.phone}
      error={phoneError}
      touched={phoneTouched}
      onChange={onPhoneChange}
      onBlur={onPhoneBlur}
      onFocus={onFormFieldFocus}
    />
  );
  const messengers = (
    <RegisterFormMessengers
      messengers={{
        viber: formData.viber,
        whatsapp: formData.whatsapp,
        telegram: formData.telegram,
      }}
      onMessengersChange={(next) => setFormData((p) => ({ ...p, ...next }))}
    />
  );
  const password = (
    <RegisterFormPassword
      value={formData.password}
      error={passwordError}
      showPassword={showPassword}
      onTogglePassword={() => setShowPassword(!showPassword)}
      onChange={onPasswordChange}
      rules={getPasswordValidationRules(formData.password)}
    />
  );

  if (formData.type === 'Individual') {
    return (
      <>
        {phoneField}
        {messengers}
        {password}
      </>
    );
  }

  return (
    <>
      <RegisterFormCompanyField formData={formData} setFormData={setFormData} />
      {phoneField}
      {messengers}
      {password}
    </>
  );
}
