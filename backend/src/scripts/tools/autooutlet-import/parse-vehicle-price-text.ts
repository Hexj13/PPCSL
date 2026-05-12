export function parseVehiclePriceText(raw: string): number | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const noSpaces = trimmed.replace(/\s/g, '');
  const euroPart = noSpaces.replace(/[€$]/gi, '').trim();
  if (!euroPart) return undefined;
  if (euroPart.includes(',') && euroPart.includes('.')) {
    const normalized = euroPart.replace(/\./g, '').replace(',', '.');
    const n = Number(normalized);
    if (!Number.isFinite(n)) return undefined;
    return Math.round(n);
  }
  if (euroPart.includes(',')) {
    const normalized = euroPart.replace(',', '.');
    const n = Number(normalized);
    if (!Number.isFinite(n)) return undefined;
    return Math.round(n);
  }
  const dotParts = euroPart.split('.');
  if (dotParts.length > 1 && dotParts.every((p) => /^\d+$/.test(p))) {
    const last = dotParts[dotParts.length - 1]!;
    if (last.length === 3) {
      const joined = dotParts.join('');
      const n = Number(joined);
      if (Number.isFinite(n)) return Math.round(n);
    }
  }
  const text = euroPart.replace(/[^0-9.,-]/g, '');
  if (!text) return undefined;
  const normalized = text.includes(',') && !text.includes('.') ? text.replace(',', '.') : text;
  const num = Number(normalized);
  if (!Number.isFinite(num)) return undefined;
  return Math.round(num);
}
