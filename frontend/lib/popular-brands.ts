type PopularBrandsConfig = {
  brands: string[];
  modelsByBrand: Record<string, string[]>;
};

const fallback: PopularBrandsConfig = {
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
    Audi: ['A3', 'A4', 'Q5', 'A6'],
    BMW: ['3 Series', '5 Series', 'X3', 'X5'],
    Citroën: ['C3', 'C4', 'Berlingo', 'C5'],
    Fiat: ['500', 'Panda', 'Punto', 'Tipo'],
    Ford: ['Focus', 'Fiesta', 'Kuga', 'Mondeo'],
    Hyundai: ['i30', 'Tucson', 'i20', 'Santa Fe'],
    'Mercedes-Benz': ['C-Class', 'E-Class', 'GLC', 'A-Class'],
    Opel: ['Corsa', 'Astra', 'Insignia', 'Mokka'],
    Peugeot: ['208', '308', '3008', '2008'],
    Renault: ['Clio', 'Megane', 'Captur', 'Duster'],
    Toyota: ['Corolla', 'Yaris', 'RAV4', 'C-HR'],
    Volkswagen: ['Golf', 'Passat', 'Tiguan', 'Polo'],
  },
};

function loadPopularBrandsConfig(): PopularBrandsConfig {
  try {
    const module = require(`./config/popular-brands`);
    return (module?.default || fallback) as PopularBrandsConfig;
  } catch {
    return fallback;
  }
}

const config = loadPopularBrandsConfig();

export const POPULAR_BRANDS = config.brands;
export const POPULAR_MODELS_BY_BRAND = config.modelsByBrand;
