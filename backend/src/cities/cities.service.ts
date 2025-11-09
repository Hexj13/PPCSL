import { Injectable } from '@nestjs/common';

import { RedisService } from '../common/redis.service';
import { CACHE_PREFIXES, CACHE_TTL, generateCacheKey } from '../common/utils/cache.utils';

export interface City {
  name: string;
  nameEn: string;
}

@Injectable()
export class CitiesService {
  private readonly CACHE_TTL = CACHE_TTL.cities.all;

  constructor(private redisService: RedisService) {}
  private readonly cities: City[] = [
    { name: 'Арачиново', nameEn: 'Aračinovo' },
    { name: 'Берово', nameEn: 'Berovo' },
    { name: 'Битола', nameEn: 'Bitola' },
    { name: 'Богданци', nameEn: 'Bogdanci' },
    { name: 'Боговиње', nameEn: 'Bogovinje' },
    { name: 'Босилово', nameEn: 'Bosilovo' },
    { name: 'Брвеница', nameEn: 'Brvenica' },
    { name: 'Валандово', nameEn: 'Valandovo' },
    { name: 'Василево', nameEn: 'Vasilevo' },
    { name: 'Велес', nameEn: 'Veles' },
    { name: 'Вевчани', nameEn: 'Vevčani' },
    { name: 'Виница', nameEn: 'Vinica' },
    { name: 'Врапчиште', nameEn: 'Vrapčište' },
    { name: 'Гевгелија', nameEn: 'Gevgelija' },
    { name: 'Гостивар', nameEn: 'Gostivar' },
    { name: 'Градско', nameEn: 'Gradsko' },
    { name: 'Дебар', nameEn: 'Debar' },
    { name: 'Дебарца', nameEn: 'Debarca' },
    { name: 'Делчево', nameEn: 'Delčevo' },
    { name: 'Демир Капија', nameEn: 'Demir Kapija' },
    { name: 'Демир Хисар', nameEn: 'Demir Hisar' },
    { name: 'Дојран', nameEn: 'Dojran' },
    { name: 'Долнени', nameEn: 'Dolneni' },
    { name: 'Желино', nameEn: 'Želino' },
    { name: 'Зајас', nameEn: 'Zajas' },
    { name: 'Зелениково', nameEn: 'Zelenikovo' },
    { name: 'Зрновци', nameEn: 'Zrnovci' },
    { name: 'Илинден', nameEn: 'Ilinden' },
    { name: 'Јегуновце', nameEn: 'Jegunovce' },
    { name: 'Кавадарци', nameEn: 'Kavadarci' },
    { name: 'Карбинци', nameEn: 'Karbinci' },
    { name: 'Кичево', nameEn: 'Kičevo' },
    { name: 'Кочани', nameEn: 'Kočani' },
    { name: 'Конче', nameEn: 'Konče' },
    { name: 'Кратово', nameEn: 'Kratovo' },
    { name: 'Крива Паланка', nameEn: 'Kriva Palanka' },
    { name: 'Кривогаштани', nameEn: 'Krivogaštani' },
    { name: 'Крушево', nameEn: 'Kruševo' },
    { name: 'Куманово', nameEn: 'Kumanovo' },
    { name: 'Липково', nameEn: 'Lipkovo' },
    { name: 'Лозово', nameEn: 'Lozovo' },
    { name: 'Македонска Каменица', nameEn: 'Makedonska Kamenica' },
    { name: 'Македонски Брод', nameEn: 'Makedonski Brod' },
    { name: 'Маврово и Ростуше', nameEn: 'Mavrovo and Rostuša' },
    { name: 'Могила', nameEn: 'Mogila' },
    { name: 'Неготино', nameEn: 'Negotino' },
    { name: 'Новаци', nameEn: 'Novaci' },
    { name: 'Ново Село', nameEn: 'Novo Selo' },
    { name: 'Охрид', nameEn: 'Ohrid' },
    { name: 'Осломеј', nameEn: 'Oslomej' },
    { name: 'Пехчево', nameEn: 'Pehčevo' },
    { name: 'Петравец', nameEn: 'Petrovec' },
    { name: 'Пласница', nameEn: 'Plasnica' },
    { name: 'Прилеп', nameEn: 'Prilep' },
    { name: 'Пробиштип', nameEn: 'Probištip' },
    { name: 'Радовиш', nameEn: 'Radoviš' },
    { name: 'Ранковце', nameEn: 'Rankovce' },
    { name: 'Ресен', nameEn: 'Resen' },
    { name: 'Росоман', nameEn: 'Rosoman' },
    { name: 'Сарај', nameEn: 'Saraj' },
    { name: 'Свети Николе', nameEn: 'Sveti Nikole' },
    { name: 'Скопје', nameEn: 'Skopje' },
    { name: 'Сопиште', nameEn: 'Sopište' },
    { name: 'Стар Дойран', nameEn: 'Star Dojran' },
    { name: 'Старо Нагоричане', nameEn: 'Staro Nagoričane' },
    { name: 'Струга', nameEn: 'Struga' },
    { name: 'Струмица', nameEn: 'Strumica' },
    { name: 'Студеничани', nameEn: 'Studeničani' },
    { name: 'Теарце', nameEn: 'Tearce' },
    { name: 'Тетово', nameEn: 'Tetovo' },
    { name: 'Чашка', nameEn: 'Čaška' },
    { name: 'Чешиново-Облешево', nameEn: 'Češinovo-Obleševo' },
    { name: 'Чучер-Сандево', nameEn: 'Čučer-Sandevo' },
    { name: 'Штип', nameEn: 'Štip' },
    { name: 'Центар Жупа', nameEn: 'Centar Župa' },
  ];

  async getAll(): Promise<City[]> {
    const cacheKey = generateCacheKey({ prefix: CACHE_PREFIXES.cities, parts: ['all'] });
    try {
      const cached = await this.redisService.getJson<City[]>(cacheKey);
      if (cached) {
        return cached;
      }
    } catch {}

    const sortedCities = [...this.cities].sort((a, b) => a.name.localeCompare(b.name, 'mk'));

    try {
      await this.redisService.setJson(cacheKey, sortedCities, this.CACHE_TTL);
    } catch {}

    return sortedCities;
  }

  findByName(name: string): City | undefined {
    return this.cities.find(
      (city) =>
        city.name.toLowerCase() === name.toLowerCase() ||
        city.nameEn.toLowerCase() === name.toLowerCase(),
    );
  }
}
