export interface PlatformSeedConfig {
  cities: string[];
  descriptions: string[];
  phonePrefix: string;
  testUserFirstName: string;
  testUserLastName: string;
  testCompanyName: string;
  transmissionLabels: {
    automatic: string;
    manual: string;
    cvt: string;
  };
}

const config: PlatformSeedConfig = {
  cities: [
    'Скопје',
    'Битола',
    'Прилеп',
    'Куманово',
    'Охрид',
    'Струга',
    'Велес',
    'Штип',
    'Кавадарци',
    'Гостивар',
    'Тетово',
    'Кичево',
    'Дебар',
    'Струмица',
  ],

  descriptions: [
    'Отлично одржан автомобил, без неисправности. Регуларно сервисиран.',
    'Прекрасен автомобил во одлично состојба. Нова гуми, ново масло.',
    'Автомобил во перфектна состојба, како нов. Одлична можност.',
    'Добро одржан автомобил со цела историја на сервисирање.',
    'Висококвалитетен автомобил, идеален за семејство.',
    'Спортски автомобил во одлично состојба. Одлични перформанси.',
    'Економичен и сигурен автомобил. Перфектен за град.',
    'Луксозен автомобил со сите опции. Премиум квалитет.',
    'Надежен автомобил за долги патувања. Одлична состојба.',
    'Модерен автомобил со најнови технологии. Одлична вредност.',
  ],

  phonePrefix: '+389',
  testUserFirstName: 'Тест',
  testUserLastName: 'Корисник',
  testCompanyName: 'Тест Компанија',

  transmissionLabels: {
    automatic: 'Автоматска',
    manual: 'Мануелна',
    cvt: 'Варијатор',
  },
};

export default config;
