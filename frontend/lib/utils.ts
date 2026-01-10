import { loadSiteConfigSync } from './site-config';

export const isBrowser = typeof window !== 'undefined';

export function getLocale(): string {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const siteConfig = loadSiteConfigSync(country);
  return siteConfig.locale.split('-')[0];
}

export type LabeledOption<T = string> = { value: T; label: string };

function getCollator(): Intl.Collator {
  const locale = getLocale();
  return new Intl.Collator(locale, { sensitivity: 'base', numeric: true });
}

export function sortByName<T extends { name: string }>(items: T[]): T[] {
  const collator = getCollator();
  return [...items].sort((a, b) => collator.compare(a.name, b.name));
}

export function compareNames(a: string, b: string): number {
  const collator = getCollator();
  return collator.compare(a, b);
}

export function sortOptionsByLabel<T>(options: Array<LabeledOption<T>>): Array<LabeledOption<T>> {
  const collator = getCollator();
  return [...options].sort((a, b) => collator.compare(a.label, b.label));
}

export function formatPrice(price: number | undefined, currency?: string): string {
  if (price === undefined || price === null) {
    return '';
  }

  if (!currency) {
    const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
    const siteConfig = loadSiteConfigSync(country);
    currency = siteConfig.currency;
  }

  const integerPrice = Math.floor(price);
  return integerPrice.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  const monthsMk = [
    'јануари',
    'февруари',
    'март',
    'април',
    'мај',
    'јуни',
    'јули',
    'август',
    'септември',
    'октомври',
    'ноември',
    'декември',
  ];

  const day = d.getDate();
  const monthName = monthsMk[d.getMonth()];
  const year = d.getFullYear();
  return `${day} ${monthName} ${year}`;
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

export function formatDateRelative(
  date: string | Date,
  t: (_key: string, _params?: Record<string, string | number>) => string
): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  // Разница в днях
  const diffTime = today.getTime() - dateOnly.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Сегодня
    return t('common.today');
  } else if (diffDays > 0 && diffDays <= 7) {
    // 1-7 дней назад
    return t('common.daysAgo', { days: diffDays });
  } else {
    // Старше 7 дней - обычная дата
    return formatDateShort(date);
  }
}

export function formatDateLong(date: string | Date): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const siteConfig = loadSiteConfigSync(country);
  return d.toLocaleDateString(siteConfig.locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatEngineVolume(volume: number): string {
  return parseFloat(volume.toString()).toFixed(1);
}

export function formatMileage(mileage: number): string {
  return mileage.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function formatTransmission(
  transmission: string | undefined,
  t: (_key: string) => string
): string {
  if (!transmission) return '';
  switch (transmission) {
    case 'Manual':
      return t('vehicleOptions.transmission.Manual');
    case 'Automatic':
      return t('vehicleOptions.transmission.Automatic');
    case 'CVT':
      return t('vehicleOptions.transmission.CVT');
    default:
      return transmission;
  }
}

export function formatDriveType(
  driveType: string | undefined,
  t: (_key: string) => string
): string {
  if (!driveType) return '';
  switch (driveType) {
    case 'FWD':
      return t('vehicleOptions.driveType.FWD');
    case 'RWD':
      return t('vehicleOptions.driveType.RWD');
    case 'AWD':
      return t('vehicleOptions.driveType.AWD');
    default:
      return driveType;
  }
}

export function formatRegistrationType(
  registrationType: string | undefined,
  t: (_key: string) => string
): string {
  if (!registrationType) return '';
  switch (registrationType) {
    case 'Local':
      return t('searchFilters.registrationTypeOptions.Local');
    case 'Foreign':
      return t('searchFilters.registrationTypeOptions.Foreign');
    case 'Cleared':
      return t('searchFilters.registrationTypeOptions.Cleared');
    default:
      return registrationType;
  }
}

export function formatBodyType(bodyType: string | undefined, t: (_key: string) => string): string {
  if (!bodyType) return '';
  switch (bodyType) {
    case 'Sedan':
      return t('vehicleOptions.bodyType.Sedan');
    case 'Hatchback':
      return t('vehicleOptions.bodyType.Hatchback');
    case 'Wagon':
      return t('vehicleOptions.bodyType.Wagon');
    case 'SUV':
      return t('vehicleOptions.bodyType.SUV');
    case 'Coupe':
      return t('vehicleOptions.bodyType.Coupe');
    case 'Convertible':
      return t('vehicleOptions.bodyType.Convertible');
    case 'Van':
      return t('vehicleOptions.bodyType.Van');
    case 'Pickup':
      return t('vehicleOptions.bodyType.Pickup');
    case 'Minivan':
      return t('vehicleOptions.bodyType.Minivan');
    case 'Truck':
      return t('vehicleOptions.bodyType.Truck');
    default:
      return bodyType;
  }
}

export function formatFuel(fuel: string | undefined, t: (_key: string) => string): string {
  if (!fuel) return '';
  switch (fuel) {
    case 'Petrol':
      return t('vehicleOptions.fuel.Petrol');
    case 'Diesel':
      return t('vehicleOptions.fuel.Diesel');
    case 'Electric':
      return t('vehicleOptions.fuel.Electric');
    case 'Hybrid':
      return t('vehicleOptions.fuel.Hybrid');
    case 'LPG':
      return t('vehicleOptions.fuel.LPG');
    default:
      return fuel;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function normalizeUrl(url: string): string {
  if (url.startsWith('http://')) {
    if (isBrowser && window.location.protocol === 'https:') {
      return url.replace('http://', 'https://');
    }
    if (process.env.NODE_ENV === 'production') {
      return url.replace('http://', 'https://');
    }
  }
  return url;
}

export function getOptimizedImageUrl(
  imageUrl: string,
  quality: number = 75,
  width?: number
): string {
  if (!imageUrl || imageUrl === '/placeholder-car.jpg') {
    return imageUrl;
  }

  let relativePath = '';

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    try {
      const url = new URL(imageUrl);
      const pathname = url.pathname;

      if (pathname.startsWith('/uploads/')) {
        relativePath = pathname.substring('/uploads/'.length);
      } else if (pathname.startsWith('/api/upload/image/')) {
        return normalizeUrl(imageUrl);
      } else {
        return normalizeUrl(imageUrl);
      }
    } catch {
      return normalizeUrl(imageUrl);
    }
  } else if (imageUrl.startsWith('/uploads/')) {
    relativePath = imageUrl.substring('/uploads/'.length);
  } else if (imageUrl.startsWith('/')) {
    relativePath = imageUrl.substring(1);
  } else {
    relativePath = imageUrl;
  }

  if (!relativePath) {
    return imageUrl;
  }

  const params = new URLSearchParams();
  if (quality) {
    params.set('quality', quality.toString());
  }
  if (width) {
    params.set('width', width.toString());
  }

  const queryString = params.toString();
  const baseUrl = normalizeUrl(API_URL);
  return `${baseUrl}/api/upload/image/${encodeURIComponent(relativePath)}${queryString ? `?${queryString}` : ''}`;
}

const cityNamesMap: Record<string, string> = {
  Aračinovo: 'Арачиново',
  Berovo: 'Берово',
  Bitola: 'Битола',
  Bogdanci: 'Богданци',
  Bogovinje: 'Боговиње',
  Bosilovo: 'Босилово',
  Brvenica: 'Брвеница',
  Valandovo: 'Валандово',
  Vasilevo: 'Василево',
  Veles: 'Велес',
  Vevčani: 'Вевчани',
  Vinica: 'Виница',
  Vrapčište: 'Врапчиште',
  Gevgelija: 'Гевгелија',
  Gostivar: 'Гостивар',
  Gradsko: 'Градско',
  Debar: 'Дебар',
  Debarca: 'Дебарца',
  Delčevo: 'Делчево',
  'Demir Kapija': 'Демир Капија',
  'Demir Hisar': 'Демир Хисар',
  Dojran: 'Дојран',
  Dolneni: 'Долнени',
  Želino: 'Желино',
  Zajas: 'Зајас',
  Zelenikovo: 'Зелениково',
  Zrnovci: 'Зрновци',
  Ilinden: 'Илинден',
  Jegunovce: 'Јегуновце',
  Kavadarci: 'Кавадарци',
  Karbinci: 'Карбинци',
  Kičevo: 'Кичево',
  Kočani: 'Кочани',
  Konče: 'Конче',
  Kratovo: 'Кратово',
  'Kriva Palanka': 'Крива Паланка',
  Krivogaštani: 'Кривогаштани',
  Kruševo: 'Крушево',
  Kumanovo: 'Куманово',
  Lipkovo: 'Липково',
  Lozovo: 'Лозово',
  'Makedonska Kamenica': 'Македонска Каменица',
  'Makedonski Brod': 'Македонски Брод',
  'Mavrovo and Rostuša': 'Маврово и Ростуше',
  Mogila: 'Могила',
  Negotino: 'Неготино',
  Novaci: 'Новаци',
  'Novo Selo': 'Ново Село',
  Ohrid: 'Охрид',
  Oslomej: 'Осломеј',
  Pehčevo: 'Пехчево',
  Petrovec: 'Петравец',
  Plasnica: 'Пласница',
  Prilep: 'Прилеп',
  Probištip: 'Пробиштип',
  Radoviš: 'Радовиш',
  Rankovce: 'Ранковце',
  Resen: 'Ресен',
  Rosoman: 'Росоман',
  Saraj: 'Сарај',
  'Sveti Nikole': 'Свети Николе',
  Skopje: 'Скопје',
  Sopište: 'Сопиште',
  'Star Dojran': 'Стар Дойран',
  'Staro Nagoričane': 'Старо Нагоричане',
  Struga: 'Струга',
  Strumica: 'Струмица',
  Studeničani: 'Студеничани',
  Tearce: 'Теарце',
  Tetovo: 'Тетово',
  Čaška: 'Чашка',
  'Češinovo-Obleševo': 'Чешиново-Облешево',
  'Čučer-Sandevo': 'Чучер-Сандево',
  Štip: 'Штип',
  'Centar Župa': 'Центар Жупа',
};

export function getCityNameMk(cityNameEn: string | undefined): string {
  if (!cityNameEn) return '';
  return cityNamesMap[cityNameEn] || cityNameEn;
}

function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, '');
}

function getPhoneWithCountryCode(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  if (digits.startsWith('389')) {
    return digits;
  }
  if (digits.length === 9) {
    return `389${digits}`;
  }
  return digits;
}

export function getTelegramUrl(phone: string | undefined): string | null {
  if (!phone) return null;
  const withCountryCode = getPhoneWithCountryCode(phone);
  return `https://t.me/+${withCountryCode}`;
}

export function getWhatsAppUrl(phone: string | undefined): string | null {
  if (!phone) return null;
  const withCountryCode = getPhoneWithCountryCode(phone);
  return `https://wa.me/${withCountryCode}`;
}

export function getViberUrl(phone: string | undefined): string | null {
  if (!phone) return null;
  const withCountryCode = getPhoneWithCountryCode(phone);
  return `viber://chat?number=${withCountryCode}`;
}

export function createSlug(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function slugToName(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function horsepowerToKw(hp: number): number {
  return Math.round(hp * 0.73549875);
}

export function kwToHorsepower(kw: number): number {
  return Math.round(kw / 0.73549875);
}
