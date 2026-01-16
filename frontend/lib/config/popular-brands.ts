export type PopularBrandsConfig = {
  brands: string[];
  modelsByBrand: Record<string, string[]>;
};

const config: PopularBrandsConfig = {
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
};

export default config;
