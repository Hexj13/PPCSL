function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

const TO_CIPAUTO_NORMALIZED: Record<string, string> = {
  gri: 'gri',
  gray: 'gri',
  grey: 'gri',
  negru: 'negru',
  black: 'negru',
  alb: 'alb',
  white: 'alb',
  alba: 'alb',
  rosu: 'rosu',
  red: 'rosu',
  albastru: 'albastru',
  blue: 'albastru',
  verde: 'verde',
  green: 'verde',
  galben: 'galben',
  yellow: 'galben',
  maro: 'maro',
  brown: 'maro',
  bej: 'bej',
  beige: 'bej',
  argintiu: 'argintiu',
  silver: 'argintiu',
  auriu: 'auriu',
  gold: 'auriu',
  portocaliu: 'portocaliu',
  orange: 'portocaliu',
  oranj: 'oranj',
  violet: 'violet',
  purple: 'violet',
  roz: 'roz',
  pink: 'roz',
  bordo: 'bordo',
  burgundy: 'bordo',
};

export function map999mdColorToCipautoRaw(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }
  const trimmed = raw.trim();
  const key = normalize(trimmed);
  return TO_CIPAUTO_NORMALIZED[key] ?? trimmed;
}
