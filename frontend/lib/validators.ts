type ValidationResult = {
  isValid: boolean;
  errorKey?: string;
  errorParams?: Record<string, string | number>;
};

type Validator<T = string> = (_value: T, _formData?: Record<string, unknown>) => ValidationResult;

export const validators = {
  required: (value: string | number | undefined | null): ValidationResult => {
    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'number' && value <= 0)
    ) {
      return { isValid: false, errorKey: 'required' };
    }
    return { isValid: true };
  },

  year: (value: string): ValidationResult => {
    if (!value) {
      return { isValid: false, errorKey: 'yearRequired' };
    }

    const year = parseInt(value, 10);
    if (isNaN(year) || !Number.isInteger(year) || year <= 0) {
      return { isValid: false, errorKey: 'yearMustBePositive' };
    }

    if (year < 1940) {
      return { isValid: false, errorKey: 'yearMinError' };
    }

    const currentYear = new Date().getFullYear();
    const maxYear = currentYear + 1;
    if (year > maxYear) {
      return { isValid: false, errorKey: 'yearMaxError', errorParams: { maxYear } };
    }

    return { isValid: true };
  },

  vin: (value: string | undefined): ValidationResult => {
    if (!value) {
      return { isValid: true };
    }

    if (value.length !== 17) {
      return { isValid: false, errorKey: 'vinLengthError' };
    }

    if (!/^[A-HJ-NPR-Z0-9]{17}$/i.test(value)) {
      return { isValid: false, errorKey: 'vinInvalidChars' };
    }

    return { isValid: true };
  },

  registrationDate: (value: string | undefined, isRegistered: boolean): ValidationResult => {
    if (!isRegistered) {
      return { isValid: true };
    }

    if (!value) {
      return { isValid: false, errorKey: 'registrationDateRequired' };
    }

    if (!/^\d{2}\.\d{4}$/.test(value)) {
      return { isValid: false, errorKey: 'registrationDateFormatError' };
    }

    const [month, year] = value.split('.');
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const inputMonth = parseInt(month, 10);
    const inputYear = parseInt(year, 10);

    if (inputYear < currentYear || (inputYear === currentYear && inputMonth < currentMonth)) {
      return { isValid: false, errorKey: 'registrationDateInvalid' };
    }

    return { isValid: true };
  },

  images: (images: string[]): ValidationResult => {
    if (images.length < 2) {
      return { isValid: false, errorKey: 'imagesMinError' };
    }
    return { isValid: true };
  },
};

export function validateField<T>(
  fieldName: string,
  value: T,
  validator: Validator<T>,
  formData?: Record<string, unknown>
): { isValid: boolean; errorKey?: string; errorParams?: Record<string, string | number> } {
  const result = validator(value, formData);
  return {
    isValid: result.isValid,
    errorKey: result.errorKey ? `listings.${result.errorKey}` : undefined,
    errorParams: result.errorParams,
  };
}
