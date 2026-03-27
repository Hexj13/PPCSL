import { ValidatorConstraint, ValidatorConstraintInterface } from 'class-validator';

import { tireWidthMmMax, tireWidthMmMin, tireWidthMmStep } from '../constants';

@ValidatorConstraint({ name: 'isTireWidthMm', async: false })
export class IsTireWidthMmConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    if (typeof value !== 'number' || !Number.isInteger(value)) return false;
    if (value < tireWidthMmMin || value > tireWidthMmMax) return false;
    return value % tireWidthMmStep === 0;
  }

  defaultMessage(): string {
    return 'validation.tireWidthMmInvalid';
  }
}
