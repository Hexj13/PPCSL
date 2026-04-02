import mdConfig from '../../../platforms/md/config';

function normalizeForCityMatch(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '');
}

function findOfficialCityName(
  regionLabel: string,
  officialCities: readonly string[],
): string | undefined {
  const key = normalizeForCityMatch(regionLabel);
  if (!key) {
    return undefined;
  }
  let best: { name: string; len: number } | undefined;
  for (const name of officialCities) {
    const cityKey = normalizeForCityMatch(name);
    if (!cityKey) {
      continue;
    }
    const exact = key === cityKey;
    const prefixOk = cityKey.length >= 4 && key.startsWith(cityKey);
    if (exact || prefixOk) {
      if (!best || cityKey.length > best.len) {
        best = { name, len: cityKey.length };
      }
    }
  }
  return best?.name;
}

const DEFAULT_MD_IMPORT_CITY =
  mdConfig.cities.find((c) => normalizeForCityMatch(c) === 'chisinau') ?? mdConfig.cities[0]!;

export function resolve999mdListingCity(parsedCity: string | undefined, cliCity: string): string {
  const trimmed = parsedCity?.trim();
  if (!trimmed) {
    return cliCity;
  }
  const official = findOfficialCityName(trimmed, mdConfig.cities);
  return official ?? DEFAULT_MD_IMPORT_CITY;
}
