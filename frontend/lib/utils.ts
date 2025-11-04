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
  quality: number = 85,
  width?: number
): string {
  if (!imageUrl || imageUrl === '/placeholder-car.jpg') {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);
    const pathname = url.pathname;
    const filename = pathname.split('/').pop();

    if (!filename) {
      return imageUrl;
    }

    const params = new URLSearchParams();
    params.set('quality', quality.toString());
    if (width) {
      params.set('width', width.toString());
    }

    return `${API_URL}/api/upload/image/${filename}?${params.toString()}`;
  } catch {
    return imageUrl;
  }
}
