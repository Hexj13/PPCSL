/* eslint-disable require-vehicle-type/require-vehicle-type -- tire taxonomy, not vehicle Brand/VehicleModel */
import type { DataSource } from 'typeorm';

import { TireBrand } from '../../tires/entities/tire-brand.entity';
import { TireModel } from '../../tires/entities/tire-model.entity';

import { TIRE_CATALOG_BULK_BRAND_NAMES } from './tire-catalog-bulk-brand-names';

function normalizeTireCatalogKey(text: string): string {
  const s = text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .trim();
  if (s.length > 0) return s;
  return `_${Buffer.from(text, 'utf8').toString('hex').slice(0, 40)}`;
}

const TIRE_CATALOG_CURATED_BRANDS_AND_MODELS: Record<string, string[]> = {
  Michelin: [
    'Primacy 4',
    'Primacy 4+',
    'Pilot Sport 4',
    'Pilot Sport 5',
    'CrossClimate 2',
    'e.Primacy',
    'Latitude Sport 3',
    'Pilot Alpin 5',
    'Alpin 6',
  ],
  Continental: [
    'PremiumContact 6',
    'PremiumContact 7',
    'EcoContact 6',
    'SportContact 7',
    'WinterContact TS 870',
    'AllSeasonContact 2',
    'CrossContact LX',
    'VanContact Ultra',
  ],
  Pirelli: [
    'P Zero',
    'Cinturato P7',
    'Cinturato All Season SF3',
    'Powergy',
    'Scorpion Verde',
    'Scorpion Winter',
    'Scorpion All Season SF2',
    'Carrier',
  ],
  Nokian: [
    'Powerproof',
    'Wetproof',
    'Snowproof',
    'Seasonproof',
    'Hakkapeliitta R5',
    'Hakkapeliitta 10',
    'Powerproof SUV',
  ],
  Dunlop: [
    'Sport Maxx RT2',
    'Sport Maxx RT',
    'Sport All Season',
    'Winter Sport 5',
    'SP Winter Response 2',
    'Grandtrek',
    'SP Sport Maxx 060+',
  ],
  Vredestein: ['Ultrac', 'Ultrac Pro', 'Wintrac Pro', 'Quatrac Pro', 'Pinza AT', 'Comtrac 2'],
  Uniroyal: [
    'RainSport 5',
    'AllSeasonExpert 2',
    'WinterExpert',
    'RainExpert 5',
    'Rallye 4x4 Street',
  ],
  Semperit: ['Speed-Life 3', 'AllSeason-Grip', 'Speed-Grip 5', 'Van-Life 3'],
  Goodyear: [
    'EfficientGrip Performance 2',
    'Eagle F1 Asymmetric 6',
    'Vector 4Seasons Gen-3',
    'UltraGrip Performance',
    'UltraGrip Ice 3',
    'Cargo Vector 2',
    'Wrangler AT Adventure',
  ],
  Cooper: [
    'Discoverer AT3 4S',
    'Discoverer All Season',
    'CS5 Ultra Touring',
    'Zeon CS8',
    'Evolution Winter',
  ],
  BFGoodrich: [
    'Advantage T/A Sport',
    'All-Terrain T/A KO2',
    'Trail-Terrain T/A',
    'Mud-Terrain T/A KM3',
    'G-Force Comp-2 A/S',
  ],
  Firestone: ['Roadhawk', 'Winterhawk 4', 'Multiseason 2', 'Destination Winter', 'Firehawk Sport'],
  'General Tire': [
    'Altimax One S',
    'Altimax Winter 3',
    'Grabber GT Plus',
    'Grabber AT3',
    'Grabber X3',
  ],
  Bridgestone: [
    'Turanza T005',
    'Turanza 6',
    'Potenza Sport',
    'Weather Control A005 Evo',
    'Blizzak LM005',
    'Blizzak 6',
    'Dueler H/P Sport',
    'Duravis All Season',
  ],
  Yokohama: [
    'Advan Sport V107',
    'Advan Fleva V701',
    'BluEarth-GT AE51',
    'BluEarth-4S AW21',
    'Geolandar A/T G015',
    'Geolandar CV G058',
    'iceGUARD iG60',
  ],
  Toyo: [
    'Proxes Sport 2',
    'Proxes Comfort',
    'Celsius',
    'Observe GSi-6',
    'Open Country A/T III',
    'Open Country U/T',
  ],
  Falken: [
    'Azenis FK520',
    'Ziex ZE310 Ecorun',
    'EuroAll Season AS210',
    'Eurowinter HS02',
    'Wildpeak A/T AT3WA',
  ],
  Hankook: [
    'Ventus Prime 4',
    'Ventus S1 evo3',
    'Kinergy 4S2',
    'Winter i*cept evo3',
    'Dynapro AT2',
    'Vantra LT',
  ],
  Kumho: [
    'Ecsta PS71',
    'Ecsta HS52',
    'Solus 4S HA32',
    'Solus TA11',
    'WinterCraft WP72',
    'Crugen HP71',
  ],
  Nexen: [
    "N'Fera SU1",
    "N'Fera Primus",
    'N Blue 4Season',
    'Winguard Sport 2',
    'Roadian AT Pro',
    'Roadian HTX RH5',
  ],
  Maxxis: [
    'Premitra HP5',
    'Premitra All Season AP3',
    'Victra Sport 5',
    'Bravo AT-771',
    'Razr AT811',
  ],
  Giti: ['GitiSport S2', 'GitiAllSeason AS1', 'GitiWinter W2', 'Giti4x4 AT70'],
  Sailun: ['Atrezzo SVA1', 'Atrezzo Elite', 'Terramax CVR', 'Terramax AT', 'Ice Blazer WSL2'],
  Linglong: [
    'GreenMax HP010',
    'GreenMax All Season',
    'Sport Master',
    'Comfort Master',
    'Winter Hero',
  ],
  Triangle: [
    'AdvanteX SUV TR259',
    'AdvanteX SUV TR258',
    'EffexSport TH202',
    'PL02',
    'Winter X TW401',
  ],
  Westlake: ['ZuperEco Z-107', 'SA37', 'RP18', 'SL369', 'SW608'],
  Goodride: ['ZuperEco Z-107', 'All Season Elite Z-401', 'SU318 H/T', 'SW608'],
  'Double Coin': ['DC99', 'DC100', 'RR150', 'RLB1'],
  Wanli: ['SA302', 'SU006', 'S1097', 'SL106'],
  Aeolus: ['AH03', 'PrecisionAce AH01', 'SnowAce2 HP', 'Transit'],
  Mitas: ['Sport Force+', 'Touring Force', 'Terra Force-R', 'E-07+'],
  Metzeler: ['Roadtec 01', 'Sportec M9 RR', 'Tourance Next 2', 'Karoo 4'],
  Heidenau: ['K66', 'K60 Scout', 'K76', 'K80 SR'],
  Shinko: ['SR777', 'SR999 Long Haul', 'E705', 'R009 Raven'],
};

export const TIRE_BRANDS_AND_MODELS: Record<string, string[]> = (() => {
  const seenNorms = new Set<string>();
  const out: Record<string, string[]> = {};
  for (const name of Object.keys(TIRE_CATALOG_CURATED_BRANDS_AND_MODELS)) {
    seenNorms.add(normalizeTireCatalogKey(name));
    out[name] = TIRE_CATALOG_CURATED_BRANDS_AND_MODELS[name];
  }
  for (const name of TIRE_CATALOG_BULK_BRAND_NAMES) {
    const norm = normalizeTireCatalogKey(name);
    if (seenNorms.has(norm)) continue;
    seenNorms.add(norm);
    out[name] = [];
  }
  return out;
})();

const OTHER_MODEL_NAME = 'Other';
const OTHER_ORDER = 999_999;

export type TireCatalogSeedSummary = {
  brandsAdded: number;
  brandsUpdated: number;
  modelsAdded: number;
  modelsUpdated: number;
  skipped: number;
  duplicates: number;
  renamed: number;
};

export async function runTireCatalogSeed(dataSource: DataSource): Promise<TireCatalogSeedSummary> {
  const summary: TireCatalogSeedSummary = {
    brandsAdded: 0,
    brandsUpdated: 0,
    modelsAdded: 0,
    modelsUpdated: 0,
    skipped: 0,
    duplicates: 0,
    renamed: 0,
  };

  const brandRepo = dataSource.getRepository(TireBrand);
  const modelRepo = dataSource.getRepository(TireModel);

  const existingBrands = await brandRepo.find();
  const normToBrand = new Map<string, TireBrand>();
  for (const b of existingBrands) {
    normToBrand.set(normalizeTireCatalogKey(b.name), b);
  }

  const brandNames = Object.keys(TIRE_BRANDS_AND_MODELS);
  let brandOrder = 0;

  for (const brandName of brandNames) {
    const norm = normalizeTireCatalogKey(brandName);
    let brand = normToBrand.get(norm);
    if (!brand) {
      brand = brandRepo.create({
        name: brandName,
        name_normalized: norm,
        order: brandOrder,
        is_archived: false,
      });
      await brandRepo.save(brand);
      normToBrand.set(norm, brand);
      summary.brandsAdded += 1;
    } else {
      let touched = false;
      if (brand.name !== brandName) {
        brand.name = brandName;
        summary.renamed += 1;
        touched = true;
      }
      if (brand.order !== brandOrder) {
        brand.order = brandOrder;
        touched = true;
      }
      if (brand.name_normalized !== norm) {
        brand.name_normalized = norm;
        touched = true;
      }
      if (touched) {
        await brandRepo.save(brand);
        summary.brandsUpdated += 1;
      } else {
        summary.skipped += 1;
      }
    }
    brandOrder += 10;

    const modelNames = TIRE_BRANDS_AND_MODELS[brandName];
    const existingModels = await modelRepo.find({ where: { brand_id: brand.id } });
    const modelNormSet = new Set(existingModels.map((m) => normalizeTireCatalogKey(m.name)));
    let mi = 0;
    for (const modelName of modelNames) {
      const mn = normalizeTireCatalogKey(modelName);
      if (mn === normalizeTireCatalogKey(OTHER_MODEL_NAME)) {
        summary.duplicates += 1;
        continue;
      }
      if (modelNormSet.has(mn)) {
        const existing = existingModels.find((m) => normalizeTireCatalogKey(m.name) === mn);
        if (existing && existing.name !== modelName) {
          existing.name = modelName;
          existing.name_normalized = mn;
          existing.order = mi * 10;
          existing.is_other = false;
          await modelRepo.save(existing);
          summary.modelsUpdated += 1;
        } else {
          summary.skipped += 1;
        }
        mi += 1;
        continue;
      }
      const model = modelRepo.create({
        brand_id: brand.id,
        name: modelName,
        name_normalized: mn,
        order: mi * 10,
        is_archived: false,
        is_other: false,
      });
      await modelRepo.save(model);
      existingModels.push(model);
      modelNormSet.add(mn);
      summary.modelsAdded += 1;
      mi += 1;
    }

    let otherModel = existingModels.find((m) => m.is_other);
    if (!otherModel) {
      otherModel = modelRepo.create({
        brand_id: brand.id,
        name: OTHER_MODEL_NAME,
        name_normalized: normalizeTireCatalogKey(OTHER_MODEL_NAME),
        order: OTHER_ORDER,
        is_archived: false,
        is_other: true,
      });
      await modelRepo.save(otherModel);
      summary.modelsAdded += 1;
    } else {
      if (otherModel.name !== OTHER_MODEL_NAME) {
        otherModel.name = OTHER_MODEL_NAME;
        otherModel.name_normalized = normalizeTireCatalogKey(OTHER_MODEL_NAME);
        summary.modelsUpdated += 1;
      }
      if (otherModel.order !== OTHER_ORDER) {
        otherModel.order = OTHER_ORDER;
        summary.modelsUpdated += 1;
      }
      otherModel.is_other = true;
      otherModel.is_archived = false;
      await modelRepo.save(otherModel);
    }
  }

  return summary;
}
