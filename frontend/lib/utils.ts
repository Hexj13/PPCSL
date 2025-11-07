export function formatPrice(price: number | undefined, _currency: 'MKD' | 'EUR' = 'MKD'): string {
  if (price === undefined || price === null) {
    return '';
  }
  const formattedPrice = new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
  return formattedPrice;
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('mk-MK', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: string | Date): string {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
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

export function formatCondition(condition: string | undefined): string {
  if (!condition) return '';
  switch (condition) {
    case 'Undamaged':
      return 'Без оштетувања';
    case 'Damaged':
      return 'Со оштетувања';
    case 'ForParts':
      return 'За делови';
    default:
      return condition;
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
      return 'Цариниран';
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
      return 'Грузовик';
    default:
      return bodyType;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getOptimizedImageUrl(
  imageUrl: string,
  quality: number = 85,
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
        return imageUrl;
      } else {
        return imageUrl;
      }
    } catch {
      return imageUrl;
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
  return `${API_URL}/api/upload/image/${encodeURIComponent(relativePath)}${queryString ? `?${queryString}` : ''}`;
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
