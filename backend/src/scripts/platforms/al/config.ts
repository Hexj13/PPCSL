export interface PlatformSeedCurrencyWeight {
  value: 'EUR' | 'MDL' | 'ALL';
  weight: number;
}

export interface PlatformSeedConfig {
  /** Stored on listings as city nameEn (canonical key for FE getCityName). */
  cities: string[];
  descriptions: string[];
  truckDescriptions: string[];
  motoDescriptions: string[];
  phonePrefix: string;
  adminPhone: string;
  userPhone: (index: number) => string;
  testUserFirstName: string;
  testUserLastName: string;
  testCompanyName: string;
  preferredLocale: string;
  /** Secondary/local currency rate vs EUR (used when listing currency is not EUR). */
  localCurrencyPerEur: number;
  currencyWeights: PlatformSeedCurrencyWeight[];
  transmissionLabels: {
    automatic: string;
    manual: string;
    cvt: string;
  };
}

const config: PlatformSeedConfig = {
  cities: [
    'Tirana',
    'Durrës',
    'Vlorë',
    'Shkodër',
    'Elbasan',
    'Fier',
    'Korçë',
    'Berat',
    'Lushnjë',
    'Kavajë',
    'Gjirokastër',
    'Sarandë',
    'Kukës',
    'Lezhë',
    'Pogradec',
    'Krujë',
    'Peshkopi',
    'Kuçovë',
    'Patos',
    'Kamëz',
    'Fushë-Krujë',
    'Laç',
    'Shijak',
    'Librazhd',
    'Gramsh',
    'Përmet',
    'Tepelenë',
    'Ballsh',
    'Burrel',
    'Rrëshen',
    'Himarë',
    'Pukë',
    'Bajram Curri',
    'Ersekë',
    'Çorovodë',
    'Delvinë',
    'Konispol',
    'Orikum',
    'Vorë',
    'Rrogozhinë',
  ],

  descriptions: [
    'Makina në gjendje të shkëlqyer, pa defekte. Mirëmbajtje e rregullt.',
    'Makina e bukur në gjendje shumë të mirë. Goma të reja, vaj i ri.',
    'Makina në gjendje perfekte, si e re. Mundësi e shkëlqyer.',
    'Makina e mirëmbajtur me historik të plotë servisi.',
    'Makina me cilësi të lartë, ideale për familje.',
    'Makina sportive në gjendje të shkëlqyer. Performancë e lartë.',
    'Makina ekonomike dhe e sigurt. Perfekte për qytet.',
    'Makina luksoze me të gjitha opsionet. Cilësi premium.',
    'Makina e besueshme për udhëtime të gjata. Gjendje e shkëlqyer.',
    'Makina moderne me teknologjitë më të reja. Vlerë e shkëlqyer.',
  ],
  truckDescriptions: [
    'Furgon në gjendje të mirë, i mirëmbajtur në kohë. Perfekt për dorëzime ditore.',
    'Kamion me historik të qartë servisi, gati për punë pa investime urgjente.',
    'Mjet tregtar ekonomik për kurse lokale dhe transport malli.',
    'Transport tregtar i besueshëm, motori dhe kutia funksionojnë si duhet.',
    'Kamion i kujdesur, ideal për biznes të vogël ose aktivitet rajonal.',
  ],
  motoDescriptions: [
    'Motocikletë në gjendje shumë të mirë, kilometrazh real dhe mirëmbajtje e përditësuar.',
    'Moto e shkathët për qytet, konsum i ulët dhe manovrim i shkëlqyer.',
    'Motocikletë e mirëmbajtur, pa probleme teknike të fshehura.',
    'Model komod për trase të gjata, motori funksionon pa të meta.',
    'Motocikletë me pamje të mirë dhe sjellje të qëndrueshme në rrugë.',
  ],

  phonePrefix: '+355',
  adminPhone: '+355691111111',
  userPhone: (index: number) => `+3556912345${String(index).padStart(2, '0')}`,
  testUserFirstName: 'Test',
  testUserLastName: 'Përdorues',
  testCompanyName: 'Kompani Test',
  preferredLocale: 'sq',
  localCurrencyPerEur: 100,
  currencyWeights: [
    { value: 'EUR', weight: 80 },
    { value: 'ALL', weight: 20 },
  ],

  transmissionLabels: {
    automatic: 'Automatike',
    manual: 'Manuale',
    cvt: 'CVT',
  },
};

export default config;
