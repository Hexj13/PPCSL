import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
import { determineVehicleType } from '../data/vehicle-classification';
import { checkEnvironment } from '../script-guard';

checkEnvironment(['stage', 'development', 'test']);

interface CarQueryMake {
  make_id: string;
  make_display: string;
  make_is_common: string;
  make_country: string;
}

interface CarQueryModel {
  model_id: string;
  model_make_id: string;
  model_name: string;
  [key: string]: string | number | boolean | undefined;
}

interface CarQueryTrim {
  trim_id: string;
  trim_make_id: string;
  trim_model_id: string;
  trim_name: string;
  [key: string]: string | number | boolean | undefined;
}

interface CarQueryResponse {
  Makes?: CarQueryMake[];
  Models?: CarQueryModel[];
  Trims?: CarQueryTrim[];
}

class CarQuerySync {
  private readonly baseUrl = 'https://www.carqueryapi.com/api/0.3';

  async getAllMakes(): Promise<string[]> {
    try {
      const url = `${this.baseUrl}/?cmd=getMakes`;
      console.log('🔍 Fetching all makes from CarQuery API...');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as CarQueryResponse;

      if (data.Makes && data.Makes.length > 0) {
        const uniqueMakes = [...new Set(data.Makes.map((m) => m.make_display))].sort();
        console.log(`✅ Successfully fetched ${uniqueMakes.length} makes`);
        return uniqueMakes;
      }

      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Error fetching makes: ${errorMessage}`);
      throw error;
    }
  }

  async getModelsForMake(makeName: string): Promise<string[]> {
    try {
      const encodedMakeName = encodeURIComponent(makeName);
      const url = `${this.baseUrl}/?cmd=getModels&make=${encodedMakeName}`;

      const response = await fetch(url);
      if (!response.ok) {
        return [];
      }

      const data = (await response.json()) as CarQueryResponse;

      if (data.Models && data.Models.length > 0) {
        const uniqueModels = [...new Set(data.Models.map((m) => m.model_name))].sort();
        return uniqueModels;
      }

      return [];
    } catch {
      return [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async syncAll() {
    console.log('🚀 Starting synchronization with CarQuery API...\n');

    if (!process.env.DB_SYNC) {
      process.env.DB_SYNC = 'false';
    }

    await AppDataSource.initialize();
    console.log('✅ Connected to database\n');

    const brandRepo = AppDataSource.getRepository(Brand);
    const modelRepo = AppDataSource.getRepository(VehicleModel);

    const makes = await this.getAllMakes();
    console.log(`\n📦 Processing ${makes.length} makes...\n`);

    const existingBrands = await brandRepo.find();
    const existingBrandsMap = new Map(existingBrands.map((b) => [b.name, b]));

    let newBrandsCount = 0;
    let newModelsCount = 0;
    let totalModelsCount = 0;
    let order = 1;
    let processed = 0;

    for (const make of makes) {
      const models = await this.getModelsForMake(make);

      if (models.length === 0) {
        processed++;
        continue;
      }

      let brand = existingBrandsMap.get(make);

      if (!brand) {
        const initialVehicleType =
          models.length > 0 ? determineVehicleType(models[0], make) : 'car';
        brand = brandRepo.create({
          name: make,
          order: order++,
          vehicle_types: [initialVehicleType],
        });
        brand = await brandRepo.save(brand);
        newBrandsCount++;
        console.log(`✅ Created new brand: ${make} (${models.length} models)`);
      } else {
        brand.order = order++;
        brand = await brandRepo.save(brand);
      }

      const existingModels = await modelRepo.find({
        where: { brand_id: brand.id },
      });
      const existingModelsMap = new Set(existingModels.map((m) => m.name));

      for (let i = 0; i < models.length; i++) {
        const modelName = models[i];

        if (!existingModelsMap.has(modelName)) {
          const vehicleType = determineVehicleType(modelName, make);
          const model = modelRepo.create({
            name: modelName,
            brand_id: brand.id,
            order: i + 1,
            vehicle_types: [vehicleType],
          });
          await modelRepo.save(model);
          newModelsCount++;
        } else {
          const existingModel = existingModels.find((m) => m.name === modelName);
          if (existingModel) {
            existingModel.order = i + 1;
            await modelRepo.save(existingModel);
          }
        }
        totalModelsCount++;
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
        const initialVehicleType =
          models.length > 0 ? determineVehicleType(models[0], make) : 'car';
        brand.vehicle_types = [initialVehicleType];
        await brandRepo.save(brand);
      }

      processed++;

      if (processed % 20 === 0) {
        console.log(`   ⏳ Processed ${processed}/${makes.length} makes...`);
      }

      await this.delay(200);
    }

    console.log(`\n✅ Synchronization completed!`);
    console.log(`   📊 Total brands: ${makes.length}`);
    console.log(`   📊 Brands with models: ${processed}`);
    console.log(`   📊 Total models: ${totalModelsCount}`);
    console.log(`   🆕 New brands: ${newBrandsCount}`);
    console.log(`   🆕 New models: ${newModelsCount}\n`);

    await AppDataSource.destroy();
    console.log('🔌 Database connection closed');
  }
}

const sync = new CarQuerySync();
sync
  .syncAll()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
