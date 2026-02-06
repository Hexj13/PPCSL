import { Inject, Injectable } from '@nestjs/common';

import { getCountry } from '../common/env';

import { CITIES_CACHE, City, ICitiesCache } from './application/ports/cities-cache.port';

const SORT_LOCALE_BY_COUNTRY: Record<string, string> = {
  md: 'ro-MD',
};

@Injectable()
export class CitiesService {
  constructor(
    @Inject(CITIES_CACHE)
    private readonly citiesCache: ICitiesCache,
  ) {}
  private readonly cities: City[] = [
    { name: 'Chișinău', nameEn: 'Chișinău', nameRu: 'Кишинёв' },
    { name: 'Bălți', nameEn: 'Bălți', nameRu: 'Бельцы' },
    { name: 'Tiraspol', nameEn: 'Tiraspol', nameRu: 'Тирасполь' },
    { name: 'Bender', nameEn: 'Bender', nameRu: 'Бендеры' },
    { name: 'Comrat', nameEn: 'Comrat', nameRu: 'Комрат' },
    { name: 'Cahul', nameEn: 'Cahul', nameRu: 'Кагул' },
    { name: 'Ceadîr-Lunga', nameEn: 'Ceadîr-Lunga', nameRu: 'Чадыр-Лунга' },
    { name: 'Edineț', nameEn: 'Edineț', nameRu: 'Единец' },
    { name: 'Hîncești', nameEn: 'Hîncești', nameRu: 'Хынчешты' },
    { name: 'Orhei', nameEn: 'Orhei', nameRu: 'Оргеев' },
    { name: 'Soroca', nameEn: 'Soroca', nameRu: 'Сороки' },
    { name: 'Strășeni', nameEn: 'Strășeni', nameRu: 'Страшены' },
    { name: 'Ungheni', nameEn: 'Ungheni', nameRu: 'Унгены' },
    { name: 'Rîbnița', nameEn: 'Rîbnița', nameRu: 'Рыбница' },
    { name: 'Căușeni', nameEn: 'Căușeni', nameRu: 'Каушаны' },
    { name: 'Drochia', nameEn: 'Drochia', nameRu: 'Дрокия' },
    { name: 'Dubăsari', nameEn: 'Dubăsari', nameRu: 'Дубэсары' },
    { name: 'Florești', nameEn: 'Florești', nameRu: 'Флорешты' },
    { name: 'Glodeni', nameEn: 'Glodeni', nameRu: 'Глодяны' },
    { name: 'Ialoveni', nameEn: 'Ialoveni', nameRu: 'Яловены' },
    { name: 'Leova', nameEn: 'Leova', nameRu: 'Леова' },
    { name: 'Nisporeni', nameEn: 'Nisporeni', nameRu: 'Ниспорены' },
    { name: 'Ocnița', nameEn: 'Ocnița', nameRu: 'Окница' },
    { name: 'Rezina', nameEn: 'Rezina', nameRu: 'Резина' },
    { name: 'Rîșcani', nameEn: 'Rîșcani', nameRu: 'Рышканы' },
    { name: 'Sîngerei', nameEn: 'Sîngerei', nameRu: 'Сынжерей' },
    { name: 'Șoldănești', nameEn: 'Șoldănești', nameRu: 'Шолдэнешть' },
    { name: 'Ștefan Vodă', nameEn: 'Ștefan Vodă', nameRu: 'Штефан Водэ' },
    { name: 'Taraclia', nameEn: 'Taraclia', nameRu: 'Тараклия' },
    { name: 'Telenești', nameEn: 'Telenești', nameRu: 'Теленешты' },
    { name: 'Cimișlia', nameEn: 'Cimișlia', nameRu: 'Чимишлия' },
    { name: 'Criuleni', nameEn: 'Criuleni', nameRu: 'Криуляны' },
    { name: 'Dondușeni', nameEn: 'Dondușeni', nameRu: 'Дондюшены' },
    { name: 'Fălești', nameEn: 'Fălești', nameRu: 'Фэлешть' },
    { name: 'Cantemir', nameEn: 'Cantemir', nameRu: 'Кантемир' },
    { name: 'Călărași', nameEn: 'Călărași', nameRu: 'Кэлэрашь' },
    { name: 'Basarabeasca', nameEn: 'Basarabeasca', nameRu: 'Басарабяска' },
    { name: 'Briceni', nameEn: 'Briceni', nameRu: 'Бричень' },
    { name: 'Anenii Noi', nameEn: 'Anenii Noi', nameRu: 'Анений Ной' },
    { name: 'Vulcănești', nameEn: 'Vulcănești', nameRu: 'Вулкэнешть' },
    { name: 'Slobozia', nameEn: 'Slobozia', nameRu: 'Слобозия' },
    { name: 'Dnestrovsc', nameEn: 'Dnestrovsc', nameRu: 'Днестровск' },
    { name: 'Grigoriopol', nameEn: 'Grigoriopol', nameRu: 'Григориополь' },
    { name: 'Camenca', nameEn: 'Camenca', nameRu: 'Каменка' },
    { name: 'Crasnoe', nameEn: 'Crasnoe', nameRu: 'Красное' },
    { name: 'Maiac', nameEn: 'Maiac', nameRu: 'Майяк' },
    { name: 'Vadul lui Vodă', nameEn: 'Vadul lui Vodă', nameRu: 'Вадул-луй-Водэ' },
    { name: 'Costești', nameEn: 'Costești', nameRu: 'Костешть' },
    { name: 'Sângera', nameEn: 'Sângera', nameRu: 'Сынжера' },
    { name: 'Codru', nameEn: 'Codru', nameRu: 'Кодру' },
    { name: 'Durlești', nameEn: 'Durlești', nameRu: 'Дурлешть' },
    { name: 'Vatra', nameEn: 'Vatra', nameRu: 'Ватра' },
    { name: 'Cricova', nameEn: 'Cricova', nameRu: 'Крикова' },
    { name: 'Condrița', nameEn: 'Condrița', nameRu: 'Кондрица' },
    { name: 'Budești', nameEn: 'Budești', nameRu: 'Будешть' },
    { name: 'Văsieni', nameEn: 'Văsieni', nameRu: 'Вэсиень' },
    { name: 'Băcioi', nameEn: 'Băcioi', nameRu: 'Бэчой' },
    { name: 'Sireți', nameEn: 'Sireți', nameRu: 'Сирець' },
    { name: 'Bălănești', nameEn: 'Bălănești', nameRu: 'Бэлэнешть' },
    { name: 'Cojușna', nameEn: 'Cojușna', nameRu: 'Кожушна' },
    { name: 'Stăuceni', nameEn: 'Stăuceni', nameRu: 'Стэучень' },
    { name: 'Tohatin', nameEn: 'Tohatin', nameRu: 'Тохатин' },
    { name: 'Bîc', nameEn: 'Bîc', nameRu: 'Бык' },
    { name: 'Ciorescu', nameEn: 'Ciorescu', nameRu: 'Чореску' },
    { name: 'Cruzești', nameEn: 'Cruzești', nameRu: 'Крузешть' },
    { name: 'Ghincești', nameEn: 'Ghincești', nameRu: 'Гинчешть' },
    { name: 'Grătiești', nameEn: 'Grătiești', nameRu: 'Грэтиешть' },
    { name: 'Hulboaca', nameEn: 'Hulboaca', nameRu: 'Хулбоака' },
    { name: 'Revaca', nameEn: 'Revaca', nameRu: 'Ревака' },
    { name: 'Văratic', nameEn: 'Văratic', nameRu: 'Вэратик' },
    { name: 'Văscăuți', nameEn: 'Văscăuți', nameRu: 'Вэскэуць' },
    { name: 'Vorniceni', nameEn: 'Vorniceni', nameRu: 'Ворничень' },
    { name: 'Zîmbreni', nameEn: 'Zîmbreni', nameRu: 'Зымбрень' },
  ];

  async getAll(): Promise<City[]> {
    try {
      const cached = await this.citiesCache.getAll();
      if (cached) {
        return cached;
      }
    } catch {
      // Ignore cache errors
    }

    const country = getCountry();
    const locale = SORT_LOCALE_BY_COUNTRY[country] || 'ro-MD';
    const sortedCities = [...this.cities].sort((a, b) => a.name.localeCompare(b.name, locale));

    try {
      await this.citiesCache.setAll(sortedCities);
    } catch {
      // Ignore cache errors
    }

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
