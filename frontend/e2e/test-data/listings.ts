export function createRandomListingPrice(min = 900, max = 99_000): string {
  const safeMin = Math.ceil(min);
  const safeMax = Math.floor(max);
  const price = Math.floor(Math.random() * (safeMax - safeMin + 1)) + safeMin;
  return String(price);
}
