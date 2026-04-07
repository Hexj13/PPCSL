import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

@ValidatorConstraint({ name: 'isName', async: false })
export class IsNameConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, _args: ValidationArguments): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    return /^[a-zA-Z\u0400-\u04FF\s-]+$/.test(value);
  }

  defaultMessage(_args: ValidationArguments): string {
    return 'validation.name';
  }
}

export function IsName(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNameConstraint,
    });
  };
}
