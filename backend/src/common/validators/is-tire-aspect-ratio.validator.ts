import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

import { tireAspectRatioMax, tireAspectRatioMin, tireAspectRatioStep } from '../constants';

@ValidatorConstraint({ name: 'isTireAspectRatio', async: false })
export class IsTireAspectRatioConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'number' || !Number.isInteger(value)) return false;
    if (value < tireAspectRatioMin || value > tireAspectRatioMax) return false;
    return value % tireAspectRatioStep === 0;
  }

  defaultMessage(): string {
    return 'validation.tireAspectRatioInvalid';
  }
}
