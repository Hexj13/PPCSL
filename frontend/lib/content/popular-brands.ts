type PopularBrandsConfig = {
  brands: string[];
  modelsByBrand: Record<string, string[]>;
};

type PopularBrandsByVehicleType = {
  car: PopularBrandsConfig;
  truck: PopularBrandsConfig;
  moto: PopularBrandsConfig;
};

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
      'Opel',
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
      Opel: ['Astra', 'Corsa', 'Crossland', 'Grandland', 'Insignia', 'Mokka', 'Vivaro', 'Zafira'],
      Peugeot: ['2008', '208', '3008', '308', '5008', '508', 'Partner', 'Traveller'],
      Renault: ['Captur', 'Clio', 'Duster', 'Kadjar', 'Megane', 'Scenic', 'Talisman', 'Twingo'],
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

function loadPopularBrandsConfig(): PopularBrandsByVehicleType {
  try {
    const module = require(`../config/popular-brands`);
    const config = module?.default || fallback;
    if (config.car && config.truck && config.moto) {
      return config as PopularBrandsByVehicleType;
    }
    return {
      car: config as PopularBrandsConfig,
      truck: fallback.truck,
      moto: fallback.moto,
    };
  } catch {
    return fallback;
  }
}

const config = loadPopularBrandsConfig();

export const POPULAR_BRANDS = config.car.brands;
export const POPULAR_MODELS_BY_BRAND = config.car.modelsByBrand;

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
