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
    'Chișinău',
    'Bălți',
    'Tiraspol',
    'Bender',
    'Comrat',
    'Cahul',
    'Ceadîr-Lunga',
    'Edineț',
    'Hîncești',
    'Orhei',
    'Soroca',
    'Strășeni',
    'Ungheni',
    'Rîbnița',
    'Căușeni',
    'Drochia',
    'Dubăsari',
    'Florești',
    'Glodeni',
    'Ialoveni',
    'Leova',
    'Nisporeni',
    'Ocnița',
    'Rezina',
    'Rîșcani',
    'Sîngerei',
    'Șoldănești',
    'Ștefan Vodă',
    'Taraclia',
    'Telenești',
    'Cimișlia',
    'Criuleni',
    'Dondușeni',
    'Fălești',
    'Cantemir',
    'Călărași',
    'Basarabeasca',
    'Briceni',
    'Anenii Noi',
    'Vulcănești',
    'Slobozia',
    'Dnestrovsc',
    'Grigoriopol',
    'Camenca',
    'Crasnoe',
    'Maiac',
    'Vadul lui Vodă',
    'Costești',
    'Sângera',
    'Codru',
    'Durlești',
    'Vatra',
    'Cricova',
    'Condrița',
    'Budești',
    'Văsieni',
    'Băcioi',
    'Sireți',
    'Bălănești',
    'Cojușna',
    'Stăuceni',
    'Tohatin',
    'Bîc',
    'Ciorescu',
    'Cruzești',
    'Ghincești',
    'Grătiești',
    'Hulboaca',
    'Revaca',
    'Văratic',
    'Văscăuți',
    'Vorniceni',
    'Zîmbreni',
  ],

  descriptions: [
    'Mașină în stare excelentă, fără defecțiuni. Service regulat.',
    'Mașină frumoasă în stare excelentă. Anvelope noi, ulei nou.',
    'Mașină în stare perfectă, ca nouă. Oportunitate excelentă.',
    'Mașină bine întreținută cu istoric complet de service.',
    'Mașină de înaltă calitate, ideală pentru familie.',
    'Mașină sport în stare excelentă. Performanțe excelente.',
    'Mașină economică și sigură. Perfectă pentru oraș.',
    'Mașină de lux cu toate opțiunile. Calitate premium.',
    'Mașină de încredere pentru călătorii lungi. Stare excelentă.',
    'Mașină modernă cu cele mai noi tehnologii. Valoare excelentă.',
  ],

  phonePrefix: '+373',
  testUserFirstName: 'Test',
  testUserLastName: 'Utilizator',
  testCompanyName: 'Companie Test',

  transmissionLabels: {
    automatic: 'Automată',
    manual: 'Manuală',
    cvt: 'Variator',
  },
};

export default config;
