export function getCountry(): string {
  return process.env.COUNTRY || process.env.NEXT_PUBLIC_COUNTRY || 'md';
}
