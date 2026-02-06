export class PhoneService {
  private static readonly MD_PREFIX = '+373';
  private static readonly MD_PHONE_LENGTH = 11;

  normalize(phone: string): string {
    let normalized = phone.replace(/\s+/g, '').replace(/[()-]/g, '');

    if (normalized.startsWith('0')) {
      normalized = PhoneService.MD_PREFIX + normalized.substring(1);
    } else if (!normalized.startsWith('+')) {
      normalized = PhoneService.MD_PREFIX + normalized;
    }

    return normalized;
  }

  isValid(phone: string): boolean {
    const normalized = this.normalize(phone);
    if (!normalized.startsWith(PhoneService.MD_PREFIX)) {
      return false;
    }
    const digits = normalized.slice(PhoneService.MD_PREFIX.length).replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 9;
  }

  equals(a: string, b: string): boolean {
    return this.normalize(a) === this.normalize(b);
  }
}
