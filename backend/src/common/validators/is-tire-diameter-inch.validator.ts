import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

import { isValidTireDiameterInch } from '../constants';

@ValidatorConstraint({ name: 'isTireDiameterInch', async: false })
export class IsTireDiameterInchConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'number' && isValidTireDiameterInch(value);
  }

  defaultMessage(): string {
    return 'validation.tireDiameterInchInvalid';
  }
}
