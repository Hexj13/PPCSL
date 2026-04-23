export function maskPhoneLastDigits(phone: string): string {
  if (!phone) {
    return phone;
  }
  const chars = phone.split('');
  let remaining = 3;
  for (let i = chars.length - 1; i >= 0 && remaining > 0; i -= 1) {
    if (/\d/.test(chars[i])) {
      chars[i] = '*';
      remaining -= 1;
    }
  }
  return chars.join('');
}
