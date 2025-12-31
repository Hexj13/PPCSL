import { loadSiteConfigSync } from './site-config';

export const isBrowser = typeof window !== 'undefined';

export function getLocale(): string {
  const country = process.env.NEXT_PUBLIC_COUNTRY || 'mk';
  const siteConfig = loadSiteConfigSync(country);
  return siteConfig.locale.split('_')[0];
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

export function formatTransmission(transmission: string | undefined): string {
  if (!transmission) return '';
  switch (transmission) {
    case 'Manual':
      return 'Мануелна';
    case 'Automatic':
      return 'Автоматска';
    case 'CVT':
      return 'Варијатор';
    default:
      return transmission;
  }
}

export function formatDriveType(driveType: string | undefined): string {
  if (!driveType) return '';
  switch (driveType) {
    case 'FWD':
      return 'Преден';
    case 'RWD':
      return 'Заден';
    case 'AWD':
      return 'Полн';
    default:
      return driveType;
  }
}

export function formatRegistrationType(registrationType: string | undefined): string {
  if (!registrationType) return '';
  switch (registrationType) {
    case 'Local':
      return 'Местна';
    case 'Foreign':
      return 'Странска';
    case 'Cleared':
      return 'Цариниран (на име на купувачот)';
    default:
      return registrationType;
  }
}

export function formatBodyType(bodyType: string | undefined): string {
  if (!bodyType) return '';
  switch (bodyType) {
    case 'Sedan':
      return 'Седан';
    case 'Hatchback':
      return 'Хечбек';
    case 'Wagon':
      return 'Караван';
    case 'SUV':
      return 'SUV';
    case 'Coupe':
      return 'Купе';
    case 'Convertible':
      return 'Кабриолет';
    case 'Van':
      return 'Фургон';
    case 'Pickup':
      return 'Пикап';
    case 'Minivan':
      return 'Миниван';
    case 'Truck':
      return 'Камион';
    default:
      return bodyType;
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
