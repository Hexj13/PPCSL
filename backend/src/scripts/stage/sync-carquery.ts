import 'reflect-metadata';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { AppDataSource } from '../../data-source';
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
      console.log('🔍 Запрашување на сите марки од CarQuery API...');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP грешка! статус: ${response.status}`);
      }

      const data = (await response.json()) as CarQueryResponse;

      if (data.Makes && data.Makes.length > 0) {
        const uniqueMakes = [...new Set(data.Makes.map((m) => m.make_display))].sort();
        console.log(`✅ Успешно добиени ${uniqueMakes.length} марки`);
        return uniqueMakes;
      }

      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`❌ Грешка при добивање на марки: ${errorMessage}`);
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
    } catch (error) {
      return [];
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async syncAll() {
    console.log('🚀 Започнување на синхронизација со CarQuery API...\n');

    await AppDataSource.initialize();
    console.log('✅ Поврзано со базата на податоци\n');

    const brandRepo = AppDataSource.getRepository(Brand);
    const modelRepo = AppDataSource.getRepository(VehicleModel);

    const makes = await this.getAllMakes();
    console.log(`\n📦 Обработка на ${makes.length} марки...\n`);

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
        brand = brandRepo.create({
          name: make,
          order: order++,
        });
        brand = await brandRepo.save(brand);
        newBrandsCount++;
        console.log(`✅ Креиран нов бренд: ${make} (${models.length} модели)`);
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
          const model = modelRepo.create({
            name: modelName,
            brand_id: brand.id,
            order: i + 1,
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

      processed++;

      if (processed % 20 === 0) {
        console.log(`   ⏳ Обработено ${processed}/${makes.length} марки...`);
      }

      await this.delay(200);
    }

    console.log(`\n✅ Синхронизацијата е завршена!`);
    console.log(`   📊 Вкупно марки: ${makes.length}`);
    console.log(`   📊 Марки со модели: ${processed}`);
    console.log(`   📊 Вкупно модели: ${totalModelsCount}`);
    console.log(`   🆕 Нови марки: ${newBrandsCount}`);
    console.log(`   🆕 Нови модели: ${newModelsCount}\n`);

    await AppDataSource.destroy();
    console.log('🔌 Врската со базата на податоци е затворена');
  }
}

const sync = new CarQuerySync();
sync
  .syncAll()
  .then(() => {
    console.log('✅ Скриптот заврши успешно');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Грешка:', error);
    process.exit(1);
  });
