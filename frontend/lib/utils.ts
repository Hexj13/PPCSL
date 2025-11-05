export function formatPrice(price: number, _currency: 'MKD' | 'EUR' = 'MKD'): string {
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
    default:
      return bodyType;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

export function getOptimizedImageUrl(
  imageUrl: string,
  _quality: number = 85,
  _width?: number
): string {
  if (!imageUrl || imageUrl === '/placeholder-car.jpg') {
    return imageUrl;
  }

  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl;
  }

  if (imageUrl.startsWith('/')) {
    return `${API_URL}${imageUrl}`;
  }

  return `${API_URL}/${imageUrl}`;
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
