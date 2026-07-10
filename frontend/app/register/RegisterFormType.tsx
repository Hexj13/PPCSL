'use client';

import { UserTypeSwitcher } from './UserTypeSwitcher';
import type { RegisterFormState } from './useRegisterPage';

type RegisterFormTypeProps = {
  formData: RegisterFormState;
  setFormData: React.Dispatch<React.SetStateAction<RegisterFormState>>;
  disabled?: boolean;
};

export function RegisterFormType({
  formData,
  setFormData,
  disabled = false,
}: RegisterFormTypeProps) {
  return (
    <UserTypeSwitcher
      value={formData.type}
      onChange={(type) => setFormData((prev) => ({ ...prev, type }))}
      individualTestId="auth-register-type-individual"
      businessTestId="auth-register-type-business"
      disabled={disabled}
    />
  );
}
