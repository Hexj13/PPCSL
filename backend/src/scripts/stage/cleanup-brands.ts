import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { Favorite } from '../../favorites/entities/favorite.entity';
import { ListingView } from '../../listings/entities/listing-view.entity';
import { Listing } from '../../listings/entities/listing.entity';
import { Vehicle } from '../../listings/entities/vehicle.entity';
import { determineVehicleType } from '../data/vehicle-classification';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

const TARGET_BRANDS = {
  Volkswagen: [
    'Golf',
    'Polo',
    'Passat',
    'Tiguan',
    'T-Roc',
    'ID.3',
    'ID.4',
    'ID.7',
    'Arteon',
    'Touran',
  ],
  Audi: ['A1', 'A3', 'A4', 'A6', 'Q3', 'Q5', 'Q7', 'Q8', 'e-tron GT', 'Q4 e-tron'],
  BMW: [
    '1 Series',
    '2 Series Gran Coupé',
    '3 Series',
    '5 Series',
    '7 Series',
    'X1',
    'X3',
    'X5',
    'i4',
    'iX',
  ],
  'Mercedes-Benz': [
    'A-Class',
    'C-Class',
    'E-Class',
    'S-Class',
    'GLA',
    'GLC',
    'GLE',
    'GLS',
    'EQE',
    'EQA',
  ],
  Porsche: ['911', 'Cayenne', 'Macan', 'Taycan', 'Panamera', '718 Cayman', '718 Boxster'],
  Opel: ['Corsa', 'Astra', 'Mokka', 'Grandland', 'Crossland', 'Insignia'],
  Renault: [
    'Clio',
    'Captur',
    'Austral',
    'Megane E-Tech',
    'Arkana',
    'Scenic E-Tech',
    'Twingo',
    'Duster',
    'Duster Adventure',
    'Symbol',
    'Logan',
    'Sandero',
    'Logan MCV',
  ],
  Peugeot: ['208', '2008', '308', '3008', '408', '508', 'e-208', 'e-3008'],
  Citroën: ['C3', 'C3 Aircross', 'C4', 'C4 X', 'C5 Aircross', 'ë-C4', 'Berlingo VP'],
  Fiat: ['500', '500e', '500X', 'Panda', 'Tipo', '600e'],
  'Alfa Romeo': ['Giulia', 'Stelvio', 'Tonale', 'Junior'],
  Lancia: ['Ypsilon'],
  Maserati: ['Ghibli', 'Quattroporte', 'Levante', 'Grecale', 'MC20', 'GranTurismo'],
  Ferrari: ['Roma', '296 GTB', '296 GTS', 'SF90 Stradale', 'Purosangue', '812 GTS'],
  Lamborghini: ['Huracán', 'Revuelto', 'Urus'],
  Bentley: ['Continental GT', 'Flying Spur', 'Bentayga'],
  'Rolls-Royce': ['Phantom', 'Ghost', 'Cullinan', 'Spectre'],
  Jaguar: ['F-Pace', 'E-Pace', 'I-Pace', 'F-Type'],
  'Land Rover': ['Defender', 'Discovery', 'Discovery Sport'],
  'Range Rover': ['Range Rover', 'Range Rover Sport', 'Range Rover Velar', 'Range Rover Evoque'],
  MINI: ['Cooper 3-Door', 'Cooper 5-Door', 'Cabrio', 'Countryman', 'Aceman'],
  Volvo: ['EX30', 'XC40', 'EX40', 'XC60', 'EX90', 'S60', 'V60'],
  Saab: ['9-3', '9-5'],
  Škoda: ['Fabia', 'Scala', 'Octavia', 'Superb', 'Kamiq', 'Karoq', 'Kodiaq', 'Enyaq'],
  SEAT: ['Ibiza', 'Leon', 'Arona', 'Ateca', 'Tarraco'],
  Cupra: ['Formentor', 'Born', 'Ateca', 'Leon', 'Tavascan'],
  'DS Automobiles': ['DS 3', 'DS 4', 'DS 7', 'DS 9'],
  Isuzu: ['D-Max', 'MU-X'],
  Mitsubishi: ['ASX', 'Eclipse Cross', 'Outlander', 'Space Star'],
  Honda: ['Civic', 'Accord', 'CR-V', 'HR-V', 'Jazz', 'e:Ny1'],
  Toyota: ['Aygo X', 'Yaris', 'Yaris Cross', 'Corolla', 'C-HR', 'RAV4', 'Camry', 'bZ4X'],
  Nissan: ['Micra', 'Juke', 'Qashqai', 'X-Trail', 'Ariya', 'Leaf'],
  Mazda: ['Mazda2', 'Mazda3', 'Mazda6', 'CX-30', 'CX-5', 'MX-30', 'CX-60'],
  Subaru: ['Impreza', 'XV/Crosstrek', 'Forester', 'Outback', 'Solterra'],
  Kia: ['Picanto', 'Rio', 'Ceed', 'Niro', 'Sportage', 'Sorento', 'EV6', 'EV9'],
  Hyundai: ['i10', 'i20', 'i30', 'Bayon', 'Kona', 'Tucson', 'Ioniq 5', 'Ioniq 6'],
  Suzuki: ['Swift', 'Ignis', 'Vitara', 'S-Cross', 'Across'],
  Dacia: ['Spring', 'Sandero', 'Jogger', 'Duster', 'Bigster'],
  Alpine: ['A110'],
  Infiniti: ['Q50', 'Q60', 'QX55'],
  Genesis: ['G70', 'G80', 'G90', 'GV60', 'GV70', 'GV80'],
  Tesla: ['Model 3', 'Model Y', 'Model S', 'Model X'],
  Polestar: ['2', '3', '4'],
  Lotus: ['Emira', 'Eletre', 'Evija'],
  'Aston Martin': ['DB12', 'Vantage', 'DBX', 'Valour'],
  McLaren: ['Artura', '750S', 'GT', '765LT'],
  Smart: ['#1', '#3', 'EQ fortwo'],
  MG: ['MG3', 'ZS', 'HS', 'MG4', 'MG5', 'Marvel R'],
  'Lynk & Co': ['01', '02', '03', '08', '09', '900'],
  BYD: ['Dolphin', 'Atto 3', 'Seal', 'Han', 'Tang'],
  Chery: ['Omoda 5', 'Tiggo 7', 'Tiggo 8', 'Jaecoo 7'],
  Geely: ['Coolray', 'Geometry C', 'Emgrand', 'Atlas'],
  Haval: ['H6', 'Jolion', 'H2', 'H3', 'H4', 'H5', 'H7', 'H8', 'H9', 'F7', 'F7x'],
  Tank: ['300', '400', '500', '700'],
  'Great Wall': ['Wingle', 'Poer', 'Cannon'],
  Abarth: ['595', '695', '500e'],
  Vauxhall: ['Corsa', 'Astra', 'Mokka', 'Grandland'],
  Proton: ['Saga', 'X50', 'X70'],
  VinFast: ['VF 3', 'VF 6', 'VF 7', 'VF 8', 'VF 9'],
  Nio: ['ET5', 'ET7', 'EL6', 'EL7', 'EC6'],
  XPeng: ['P7', 'G6', 'G9', 'P5'],
};

const BRAND_NAME_MAPPING: Record<string, string[]> = {
  'DS Automobiles': ['DS', 'DS Automobiles'],
  Citroën: ['Citroen', 'Citroën'],
  MINI: ['Mini', 'MINI'],
  Škoda: ['Skoda', 'Škoda'],
  SEAT: ['Seat', 'SEAT'],
  'Mercedes-Benz': ['Mercedes-Benz', 'Mercedes'],
};

const ALL_CAPS_BRANDS = new Set(['BMW', 'MINI', 'SEAT', 'BYD', 'MG']);

const BRAND_NAMES_CORRECT_CASING: Record<string, string> = {
  mclaren: 'McLaren',
  vinfast: 'VinFast',
  xpeng: 'XPeng',
  bmw: 'BMW',
  mini: 'MINI',
  seat: 'SEAT',
  byd: 'BYD',
  mg: 'MG',
};

function normalizeBrandName(name: string): string {
  const lowerName = name.toLowerCase();
  if (BRAND_NAMES_CORRECT_CASING[lowerName]) {
    return BRAND_NAMES_CORRECT_CASING[lowerName];
  }

  if (ALL_CAPS_BRANDS.has(name.toUpperCase())) {
    return name.toUpperCase();
  }

  const words = name.split(/[\s-]+/);
  return words
    .map((word, index) => {
      if (word.length === 0) return word;
      if (word.toUpperCase() === word && word.length > 1) {
        return word;
      }
      if (word.toLowerCase() === 'mc' && index < words.length - 1) {
        return 'Mc';
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(name.includes('-') ? '-' : ' ');
}

async function cleanupAndSyncBrands() {
  console.log('🚀 Starting brands cleanup and synchronization...\n');

  await AppDataSource.initialize();
  console.log('✅ Connected to database\n');

  const brandRepo = AppDataSource.getRepository(Brand);
  const modelRepo = AppDataSource.getRepository(VehicleModel);
  const listingRepo = AppDataSource.getRepository(Listing);
  const vehicleRepo = AppDataSource.getRepository(Vehicle);
  const listingViewRepo = AppDataSource.getRepository(ListingView);
  const favoriteRepo = AppDataSource.getRepository(Favorite);

  const allBrands = await brandRepo.find({ relations: ['models'] });
  console.log(`📊 Found ${allBrands.length} brands in database\n`);

  const targetBrandNames = new Set(Object.keys(TARGET_BRANDS));
  const normalizedTargetBrands = new Map<string, string>();

  for (const brandName of targetBrandNames) {
    const normalized = brandName.toLowerCase().trim();
    normalizedTargetBrands.set(normalized, brandName);

    const mappedVariants = BRAND_NAME_MAPPING[brandName];
    if (mappedVariants) {
      for (const variant of mappedVariants) {
        normalizedTargetBrands.set(variant.toLowerCase().trim(), brandName);
      }
    }
  }

  const brandsToKeep: Brand[] = [];
  const brandsToDelete: Brand[] = [];
  const brandsToMerge: Map<string, Brand> = new Map();

  for (const brand of allBrands) {
    const normalized = brand.name.toLowerCase().trim();
    const targetBrandName = normalizedTargetBrands.get(normalized);

    if (targetBrandName) {
      const existingTargetBrand = brandsToKeep.find((b) => {
        const bNormalized = b.name.toLowerCase().trim();
        return bNormalized === targetBrandName.toLowerCase().trim();
      });

      if (existingTargetBrand && existingTargetBrand.id !== brand.id) {
        brandsToMerge.set(brand.id, existingTargetBrand);
      } else {
        brandsToKeep.push(brand);
      }
    } else {
      brandsToDelete.push(brand);
    }
  }

  for (const [brandIdToMerge, targetBrand] of brandsToMerge) {
    const brandToMerge = allBrands.find((b) => b.id === brandIdToMerge);
    if (brandToMerge && targetBrand.id) {
      const models = await modelRepo.find({ where: { brand_id: brandToMerge.id } });
      for (const model of models) {
        await modelRepo.update(model.id, { brand_id: targetBrand.id });
      }
      const vehicles = await vehicleRepo.find({ where: { brand_id: brandToMerge.id } });
      for (const vehicle of vehicles) {
        await vehicleRepo.update(vehicle.id, { brand_id: targetBrand.id });
      }
      await brandRepo.remove(brandToMerge);
      console.log(`  ♻️  Merged: ${brandToMerge.name} -> ${targetBrand.name}`);
    }
  }

  console.log(`✅ Brands to keep: ${brandsToKeep.length}`);
  console.log(`❌ Brands to delete: ${brandsToDelete.length}\n`);

  let deletedListings = 0;
  let deletedVehicles = 0;

  for (const brand of brandsToDelete) {
    const vehicles = await vehicleRepo.find({ where: { brand_id: brand.id } });

    for (const vehicle of vehicles) {
      const listings = await listingRepo.find({ where: { vehicle_id: vehicle.id } });
      for (const listing of listings) {
        const views = await listingViewRepo.find({ where: { listing_id: listing.id } });
        for (const view of views) {
          await listingViewRepo.remove(view);
        }
        const favorites = await favoriteRepo.find({ where: { listing_id: listing.id } });
        for (const favorite of favorites) {
          await favoriteRepo.remove(favorite);
        }
        await listingRepo.remove(listing);
        deletedListings++;
      }
      await vehicleRepo.remove(vehicle);
      deletedVehicles++;
    }

    const models = await modelRepo.find({ where: { brand_id: brand.id } });
    for (const model of models) {
      await modelRepo.remove(model);
    }

    await brandRepo.remove(brand);
    console.log(`  ❌ Deleted: ${brand.name}`);
  }

  console.log(`\n📊 Deletion completed:`);
  console.log(`   - Deleted listings: ${deletedListings}`);
  console.log(`   - Deleted vehicles: ${deletedVehicles}\n`);

  let order = 1;
  const targetBrandNamesArray = Object.keys(TARGET_BRANDS);

  for (const targetBrandName of targetBrandNamesArray) {
    let brand = brandsToKeep.find((b) => {
      const normalized = b.name.toLowerCase().trim();
      const targetNormalized = targetBrandName.toLowerCase().trim();
      const mappedVariants = BRAND_NAME_MAPPING[targetBrandName];

      if (normalized === targetNormalized) {
        return true;
      }

      if (mappedVariants) {
        return mappedVariants.some((variant) => normalized === variant.toLowerCase().trim());
      }

      return false;
    });

    const normalizedTargetName = normalizeBrandName(targetBrandName);

    if (!brand) {
      const existingBrandWithTargetName = await brandRepo.findOne({
        where: { name: normalizedTargetName },
      });

      if (existingBrandWithTargetName) {
        brand = existingBrandWithTargetName;
        console.log(`♻️  Користен постоечки бренд: ${normalizedTargetName}`);
      } else {
        const models = (TARGET_BRANDS as Record<string, string[]>)[targetBrandName] ?? [];
        const initialVehicleType =
          models.length > 0 ? determineVehicleType(models[0], normalizedTargetName) : 'car';
        brand = brandRepo.create({
          name: normalizedTargetName,
          order: order++,
          vehicle_types: [initialVehicleType],
        });
        brand = await brandRepo.save(brand);
        console.log(`✅ Креиран нов бренд: ${normalizedTargetName}`);
      }
    } else {
      if (brand.name !== normalizedTargetName) {
        const existingBrandWithTargetName = await brandRepo.findOne({
          where: { name: normalizedTargetName },
        });

        if (existingBrandWithTargetName && existingBrandWithTargetName.id !== brand.id) {
          const existingModels = await modelRepo.find({ where: { brand_id: brand.id } });
          for (const model of existingModels) {
            if (existingBrandWithTargetName.id) {
              await modelRepo.update(model.id, { brand_id: existingBrandWithTargetName.id });
            }
          }
          const existingVehicles = await vehicleRepo.find({ where: { brand_id: brand.id } });
          for (const vehicle of existingVehicles) {
            if (existingBrandWithTargetName.id) {
              await vehicleRepo.update(vehicle.id, { brand_id: existingBrandWithTargetName.id });
            }
          }
          await brandRepo.remove(brand);
          brand = existingBrandWithTargetName;
          console.log(`♻️  Объединен с постоечки бренд: ${normalizedTargetName}`);
        } else {
          brand.name = normalizedTargetName;
        }
      }
      brand.order = order++;
      brand = await brandRepo.save(brand);
    }

    const targetModels = TARGET_BRANDS[targetBrandName as keyof typeof TARGET_BRANDS];
    const existingModels = await modelRepo.find({
      where: { brand_id: brand.id },
    });

    const targetModelsSet = new Set(targetModels);
    const targetModelsLowerMap = new Map<string, string>();
    for (const tm of targetModels) {
      targetModelsLowerMap.set(tm.toLowerCase(), tm);
    }

    const modelsToDelete: typeof existingModels = [];
    const modelsToUpdate: Array<{ model: (typeof existingModels)[0]; targetName: string }> = [];

    for (const existingModel of existingModels) {
      if (targetModelsSet.has(existingModel.name)) {
        modelsToUpdate.push({ model: existingModel, targetName: existingModel.name });
      } else {
        const targetName = targetModelsLowerMap.get(existingModel.name.toLowerCase());
        if (targetName) {
          modelsToUpdate.push({ model: existingModel, targetName });
        } else {
          modelsToDelete.push(existingModel);
        }
      }
    }

    for (const modelToDelete of modelsToDelete) {
      const vehiclesWithModel = await vehicleRepo.find({ where: { model_id: modelToDelete.id } });

      for (const vehicle of vehiclesWithModel) {
        const listings = await listingRepo.find({ where: { vehicle_id: vehicle.id } });
        for (const listing of listings) {
          const views = await listingViewRepo.find({ where: { listing_id: listing.id } });
          for (const view of views) {
            await listingViewRepo.remove(view);
          }
          const favorites = await favoriteRepo.find({ where: { listing_id: listing.id } });
          for (const favorite of favorites) {
            await favoriteRepo.remove(favorite);
          }
          await listingRepo.remove(listing);
          deletedListings++;
        }
        await vehicleRepo.remove(vehicle);
        deletedVehicles++;
      }

      await modelRepo.remove(modelToDelete);
    }

    const modelsByTargetName = new Map<string, (typeof existingModels)[0]>();
    for (const { model, targetName } of modelsToUpdate) {
      if (!modelsByTargetName.has(targetName)) {
        modelsByTargetName.set(targetName, model);
      } else {
        const existingModelInMap = modelsByTargetName.get(targetName)!;
        if (existingModelInMap.name !== targetName) {
          modelsByTargetName.set(targetName, model);
        }
      }
    }

    for (let i = 0; i < targetModels.length; i++) {
      const modelName = targetModels[i];
      const existingModel = modelsByTargetName.get(modelName);

      if (existingModel) {
        if (existingModel.name !== modelName) {
          existingModel.name = modelName;
        }
        existingModel.order = i + 1;
        await modelRepo.save(existingModel);
      } else {
        const vehicleType = determineVehicleType(modelName, brand.name);
        const model = modelRepo.create({
          name: modelName,
          brand_id: brand.id,
          order: i + 1,
          vehicle_types: [vehicleType],
        });
        await modelRepo.save(model);
      }
    }

    const duplicateModels = await modelRepo.find({
      where: { brand_id: brand.id },
    });

    const seenNames = new Set<string>();
    for (const model of duplicateModels) {
      const lowerName = model.name.toLowerCase();
      if (seenNames.has(lowerName) && !targetModelsSet.has(model.name)) {
        await modelRepo.remove(model);
      } else {
        seenNames.add(lowerName);
      }
    }

    const allModelsForBrand = await modelRepo.find({
      where: { brand_id: brand.id },
      select: ['vehicle_types'],
    });
    const vehicleTypes = new Set<'car' | 'truck' | 'moto' | 'tire'>();
    for (const model of allModelsForBrand) {
      if (model.vehicle_types?.[0]) {
        vehicleTypes.add(model.vehicle_types[0]);
      }
    }
    if (vehicleTypes.size > 0) {
      brand.vehicle_types = Array.from(vehicleTypes).sort();
      await brandRepo.save(brand);
    } else if (!brand.vehicle_types || brand.vehicle_types.length === 0) {
      const models = (TARGET_BRANDS as Record<string, string[]>)[targetBrandName] ?? [];
      const initialVehicleType =
        models.length > 0 ? determineVehicleType(models[0], normalizedTargetName) : 'car';
      brand.vehicle_types = [initialVehicleType];
      await brandRepo.save(brand);
    }

    console.log(`  ✓ ${targetModels.length} модели за ${targetBrandName}`);
  }

  const allRemainingBrands = await brandRepo.find();
  const finalTargetBrands = new Set(Object.keys(TARGET_BRANDS));
  const validBrandNamesSet = new Set<string>();
  const validNormalizedNamesSet = new Set<string>();

  const validAllCapsBrands = new Set(['BMW', 'MINI', 'SEAT', 'BYD', 'MG']);

  for (const targetBrandName of finalTargetBrands) {
    validBrandNamesSet.add(targetBrandName);
    const normalized = targetBrandName.toLowerCase().trim();
    validNormalizedNamesSet.add(normalized);

    const mappedVariants = BRAND_NAME_MAPPING[targetBrandName];
    if (mappedVariants) {
      for (const variant of mappedVariants) {
        validNormalizedNamesSet.add(variant.toLowerCase().trim());
      }
    }
  }

  const validBrandIds = new Set<string>();
  for (const targetBrandName of finalTargetBrands) {
    const brand = await brandRepo.findOne({
      where: { name: targetBrandName },
    });
    if (brand) {
      validBrandIds.add(brand.id);
    }
  }

  let additionalDeleted = 0;
  for (const brand of allRemainingBrands) {
    const normalized = brand.name.toLowerCase().trim();
    const isExactMatch = validBrandNamesSet.has(brand.name);
    const isNormalizedMatch = validNormalizedNamesSet.has(normalized);
    const isValidId = validBrandIds.has(brand.id);

    const isAllCaps =
      brand.name === brand.name.toUpperCase() && brand.name.length > 0 && /[A-Z]/.test(brand.name);
    const isValidAllCaps = validAllCapsBrands.has(brand.name);

    const shouldDelete =
      (!isExactMatch && !isNormalizedMatch && !isValidId) || (isAllCaps && !isValidAllCaps);

    if (shouldDelete) {
      const vehicles = await vehicleRepo.find({ where: { brand_id: brand.id } });

      for (const vehicle of vehicles) {
        const listings = await listingRepo.find({ where: { vehicle_id: vehicle.id } });
        for (const listing of listings) {
          const views = await listingViewRepo.find({ where: { listing_id: listing.id } });
          for (const view of views) {
            await listingViewRepo.remove(view);
          }
          const favorites = await favoriteRepo.find({ where: { listing_id: listing.id } });
          for (const favorite of favorites) {
            await favoriteRepo.remove(favorite);
          }
          await listingRepo.remove(listing);
          deletedListings++;
        }
        await vehicleRepo.remove(vehicle);
        deletedVehicles++;
      }

      const models = await modelRepo.find({ where: { brand_id: brand.id } });
      for (const model of models) {
        await modelRepo.remove(model);
      }

      await brandRepo.remove(brand);
      additionalDeleted++;
      console.log(`  ❌ Дополнително избришан: ${brand.name}`);
    }
  }

  if (additionalDeleted > 0) {
    console.log(`\n📊 Дополнително избришани: ${additionalDeleted} марки`);
  }

  const finalBrands = await brandRepo.find({ order: { order: 'ASC' } });
  console.log(`\n✅ Synchronization completed!`);
  console.log(`   📊 Total brands: ${finalBrands.length}`);
  console.log(`   📊 Expected brands: ${targetBrandNamesArray.length}`);
  console.log(`   📊 Total models: ${Object.values(TARGET_BRANDS).flat().length}`);
  console.log(`   🗑️  Deleted listings: ${deletedListings}`);
  console.log(`   🗑️  Deleted vehicles: ${deletedVehicles}\n`);

  await AppDataSource.destroy();
  console.log('🔌 Database connection closed');
}

cleanupAndSyncBrands()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
