export function mapColor(raw?: string): { value?: string; warning?: string } {
  if (!raw) {
    return {};
  }

  const normalized = normalize(raw);
  const mapping: Record<string, string> = {
    alb: 'white',
    negru: 'black',
    gri: 'gray',
    argintiu: 'silver',
    albastru: 'blue',
    albastrudeschis: 'light_blue',
    albastruinchis: 'dark_blue',
    rosu: 'red',
    verde: 'green',
    verdedeschis: 'light_green',
    verdeinchis: 'dark_green',
    galben: 'yellow',
    maro: 'brown',
    portocaliu: 'orange',
    oranj: 'orange',
    bej: 'beige',
    auriu: 'gold',
    bordo: 'burgundy',
    hameleon: 'chameleon',
    roz: 'pink',
    violet: 'violet',
    zmeuriu: 'pink',
  };

  const value = mapping[normalized];
  if (!value) {
    return { value: 'other', warning: `UNMAPPED_COLOR:${raw}` };
  }
  return { value };
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}
