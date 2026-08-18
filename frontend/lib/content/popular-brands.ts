type PopularBrandsConfig = {
  brands: string[];
  modelsByBrand: Record<string, string[]>;
};

type PopularBrandsByVehicleType = {
  car: PopularBrandsConfig;
  truck: PopularBrandsConfig;
  moto: PopularBrandsConfig;
};

type PopularBrandsJsonItem = {
  brand: string;
  top_models: Array<{ model: string; most_popular: boolean }>;
};

type PopularBrandsJson = {
  market: string;
  segment: string;
  brands: PopularBrandsJsonItem[];
};

function isPopularBrandsJson(data: unknown): data is PopularBrandsJson {
  if (
    typeof data !== 'object' ||
    data === null ||
    !Array.isArray((data as PopularBrandsJson).brands)
  )
    return false;
  const brands = (data as PopularBrandsJson).brands;
  return brands.every((b) => typeof b.brand === 'string' && Array.isArray(b.top_models));
}

function carConfigFromJson(data: PopularBrandsJson): PopularBrandsConfig {
  return {
    brands: data.brands.map((b) => b.brand),
    modelsByBrand: Object.fromEntries(
      data.brands.map((b) => [b.brand, b.top_models.map((m) => m.model)]),
    ),
  };
}

function mostPopularFromJson(data: PopularBrandsJson): Record<string, string> {
  return Object.fromEntries(
    data.brands.flatMap((b) => {
      const m = b.top_models.find((x) => x.most_popular);
      return m ? [[b.brand, m.model]] : [];
    }),
  );
}

const fallback: PopularBrandsByVehicleType = {
  car: {
    brands: [
      'Audi',
      'BMW',
      'Citroën',
      'Fiat',
      'Ford',
      'Hyundai',
      'Mercedes-Benz',
      'Peugeot',
      'Renault',
      'Toyota',
      'Volkswagen',
    ],
    modelsByBrand: {
      Audi: ['A3', 'A4', 'A5', 'A6', 'Q3', 'Q5', 'Q7', 'TT'],
      BMW: ['1 Series', '2 Series', '3 Series', '5 Series', 'X1', 'X3', 'X5', 'X6'],
      Citroën: ['Berlingo', 'C3', 'C4', 'C4 Cactus', 'C5', 'C5 Aircross', 'Jumper', 'Spacetourer'],
      Fiat: ['500', '500X', 'Doblo', 'Panda', 'Punto', 'Tipo', 'Toro', 'Ulysse'],
      Ford: ['EcoSport', 'Edge', 'Fiesta', 'Focus', 'Kuga', 'Mondeo', 'Mustang', 'S-Max'],
      Hyundai: ['i10', 'i20', 'i30', 'Kona', 'Santa Fe', 'Tucson', 'Veloster', 'ix35'],
      'Mercedes-Benz': [
        'A-Class',
        'B-Class',
        'C-Class',
        'E-Class',
        'GLC',
        'GLE',
        'S-Class',
        'V-Class',
      ],
      Peugeot: ['2008', '208', '3008', '308', '5008', '508', 'Partner', 'Traveller'],
      Renault: [
        'Captur',
        'Clio',
        'Duster',
        'Duster Adventure',
        'Kadjar',
        'Logan',
        'Megane',
        'Sandero',
        'Scenic',
        'Symbol',
        'Talisman',
        'Twingo',
      ],
      Toyota: ['Auris', 'C-HR', 'Corolla', 'Prius', 'RAV4', 'Yaris', 'Aygo', 'Land Cruiser'],
      Volkswagen: ['Golf', 'Jetta', 'Passat', 'Polo', 'Tiguan', 'Touareg', 'Touran', 'T-Cross'],
    },
  },
  truck: {
    brands: [
      'Mercedes-Benz',
      'MAN',
      'Scania',
      'Volvo',
      'Iveco',
      'DAF',
      'Renault',
      'Ford',
      'Isuzu',
      'Hino',
    ],
    modelsByBrand: {
      'Mercedes-Benz': [
        'Actros',
        'Arocs',
        'Antos',
        'Atego',
        'Axor',
        'Econic',
        'Unimog',
        'Zetros',
        'Citaro',
        'Tourismo',
        'Intouro',
        'Integro',
      ],
      MAN: ['TGX', 'TGS', 'TGL', 'TGM', 'eTGM', 'eTGE'],
      Scania: ['R-Series', 'S-Series', 'P-Series', 'G-Series', 'L-Series', 'XT'],
      Volvo: ['FH', 'FM', 'FMX', 'VNR', 'VNL', 'VHD'],
      Iveco: ['Stralis', 'Daily', 'Eurocargo', 'Tector', 'S-Way', 'Trakker', 'Hi-Way'],
      DAF: ['XF', 'CF', 'LF', 'XG', 'XG+', 'XF Electric'],
      Renault: ['T', 'C', 'K', 'D', 'Master', 'Trafic'],
      Ford: ['F-150', 'F-250', 'F-350', 'F-450', 'F-550', 'Ranger', 'Transit', 'Cargo', 'F-MAX'],
      Isuzu: ['N-Series', 'F-Series', 'Giga', 'Forward', 'Elf'],
      Hino: ['500 Series', '300 Series', '700 Series', 'Profia', 'Dutro'],
    },
  },
  moto: {
    brands: [
      'Honda',
      'Yamaha',
      'Kawasaki',
      'Suzuki',
      'BMW',
      'Ducati',
      'KTM',
      'Harley-Davidson',
      'Triumph',
      'Aprilia',
      'MV Agusta',
      'Moto Guzzi',
    ],
    modelsByBrand: {
      Honda: [
        'CBR1000RR',
        'CBR600RR',
        'CB650R',
        'CB500F',
        'Africa Twin',
        'Gold Wing',
        'Rebel',
        'CRF450',
      ],
      Yamaha: ['YZF-R1', 'YZF-R6', 'MT-07', 'MT-09', 'MT-10', 'Ténéré', 'FJR1300', 'VMAX'],
      Kawasaki: ['Ninja ZX-10R', 'Ninja ZX-6R', 'Ninja 650', 'Z900', 'Versys', 'Vulcan'],
      Suzuki: ['GSX-R1000', 'GSX-R750', 'GSX-S1000', 'V-Strom', 'Hayabusa', 'Boulevard'],
      BMW: ['R1250GS', 'S1000RR', 'R1250RT', 'F850GS', 'K1600GT', 'R nineT'],
      Ducati: ['Panigale V4', 'Monster', 'Multistrada', 'Diavel', 'Scrambler', 'Hypermotard'],
      KTM: ['1290 Super Duke', '890 Adventure', '790 Duke', '450 EXC', '390 Duke'],
      'Harley-Davidson': [
        'Street Glide',
        'Road Glide',
        'Softail',
        'Sportster',
        'Fat Boy',
        'Heritage Classic',
      ],
      Triumph: ['Tiger', 'Speed Triple', 'Bonneville', 'Rocket 3', 'Scrambler', 'Thruxton'],
      Aprilia: ['RSV4', 'Tuono', 'Dorsoduro', 'Shiver', 'Caponord'],
      'MV Agusta': ['F4', 'Brutale', 'Dragster', 'Turismo Veloce'],
      'Moto Guzzi': ['V7', 'V9', 'V85 TT', 'California', 'Griso'],
    },
  },
};

let mostPopularModelByBrandCar: Record<string, string> = {};
let mostPopularModelByBrandTruck: Record<string, string> = {};
let mostPopularModelByBrandMoto: Record<string, string> = {};

function safeParseJson(data: unknown): PopularBrandsJson | null {
  return isPopularBrandsJson(data) ? data : null;
}

function loadPopularBrandsConfig(): PopularBrandsByVehicleType {
  let car: PopularBrandsConfig = fallback.car;
  try {
    const carJson = safeParseJson(require('../config/popular-brands.json'));
    if (carJson) {
      car = carConfigFromJson(carJson);
      mostPopularModelByBrandCar = mostPopularFromJson(carJson);
    }
  } catch {
    // keep fallback
  }

  let truck: PopularBrandsConfig = fallback.truck;
  try {
    const truckJson = safeParseJson(require('../config/popular-brands-truck.json'));
    if (truckJson) {
      truck = carConfigFromJson(truckJson);
      mostPopularModelByBrandTruck = mostPopularFromJson(truckJson);
    }
  } catch {
    // keep fallback
  }

  let moto: PopularBrandsConfig = fallback.moto;
  try {
    const motoJson = safeParseJson(require('../config/popular-brands-moto.json'));
    if (motoJson) {
      moto = carConfigFromJson(motoJson);
      mostPopularModelByBrandMoto = mostPopularFromJson(motoJson);
    }
  } catch {
    // keep fallback
  }

  return { car, truck, moto };
}

const config = loadPopularBrandsConfig();

export const POPULAR_BRANDS = config.car.brands;
export const POPULAR_MODELS_BY_BRAND = config.car.modelsByBrand;
export const MOST_POPULAR_MODEL_BY_BRAND = mostPopularModelByBrandCar;
export const MOST_POPULAR_MODEL_BY_BRAND_TRUCK = mostPopularModelByBrandTruck;
export const MOST_POPULAR_MODEL_BY_BRAND_MOTO = mostPopularModelByBrandMoto;

export const POPULAR_BRANDS_BY_VEHICLE_TYPE = {
  car: config.car,
  truck: config.truck,
  moto: config.moto,
};

export function getPopularBrands(vehicleType: 'car' | 'truck' | 'moto' = 'car'): string[] {
  const config = POPULAR_BRANDS_BY_VEHICLE_TYPE[vehicleType];
  return config?.brands || [];
}

export function getPopularModelsByBrand(
  vehicleType: 'car' | 'truck' | 'moto' = 'car',
): Record<string, string[]> {
  const config = POPULAR_BRANDS_BY_VEHICLE_TYPE[vehicleType];
  return config?.modelsByBrand || {};
}

export function getMostPopularModel(
  brand: string,
  vehicleType: 'car' | 'truck' | 'moto' = 'car',
): string | undefined {
  if (vehicleType === 'truck') return mostPopularModelByBrandTruck[brand];
  if (vehicleType === 'moto') return mostPopularModelByBrandMoto[brand];
  return mostPopularModelByBrandCar[brand];
}
