import { BadRequestException } from '@nestjs/common';

export function validateRegistrationDate(registrationExpiresAt: string | undefined): void {
  if (!registrationExpiresAt) {
    return;
  }

  const registrationDate = new Date(registrationExpiresAt);
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();
  const registrationMonth = registrationDate.getMonth();
  const registrationYear = registrationDate.getFullYear();

  if (
    registrationYear < currentYear ||
    (registrationYear === currentYear && registrationMonth < currentMonth)
  ) {
    throw new BadRequestException('errors.registrationDateInvalid');
  }
}
