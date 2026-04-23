import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { validatePhoneForSms, PHONE_SMS_ERROR_KEYS } from '../utils/validate-phone-for-sms';

@ValidatorConstraint({ name: 'isPhone', async: false })
export class IsPhoneConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return validatePhoneForSms(value).ok;
  }

  defaultMessage(args: ValidationArguments): string {
    const record = args.object as Record<string, unknown>;
    const raw = record[args.property];
    if (typeof raw !== 'string') {
      return PHONE_SMS_ERROR_KEYS.generic;
    }
    const result = validatePhoneForSms(raw);
    return result.ok ? PHONE_SMS_ERROR_KEYS.generic : result.errorKey;
  }
}

export function IsPhone(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsPhoneConstraint,
    });
  };
}
