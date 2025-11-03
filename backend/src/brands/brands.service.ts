import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Brand } from './entities/brand.entity';
import { VehicleModel } from './entities/vehicle-model.entity';

@Injectable()
export class BrandsService {
  constructor(
    @InjectRepository(Brand)
    private brandsRepository: Repository<Brand>,
    @InjectRepository(VehicleModel)
    private modelsRepository: Repository<VehicleModel>,
  ) {}

  async findAll(): Promise<Brand[]> {
    return this.brandsRepository.find({
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Brand> {
    return this.brandsRepository.findOne({
      where: { id },
      relations: ['models'],
    });
  }

  async findByName(name: string): Promise<Brand> {
    return this.brandsRepository.findOne({
      where: { name },
    });
  }

  async getModelsByBrand(brandId: string): Promise<VehicleModel[]> {
    return this.modelsRepository.find({
      where: { brand_id: brandId },
      order: { name: 'ASC' },
      relations: ['brand'],
    });
  }

  async getModelsByBrandName(brandName: string): Promise<VehicleModel[]> {
    const brand = await this.findByName(brandName);
    if (!brand) {
      return [];
    }
    return this.getModelsByBrand(brand.id);
  }

  async seedBrandsAndModels() {
    const brandsData = [
      { name: 'Toyota', order: 1 },
      { name: 'Volkswagen', order: 2 },
      { name: 'BMW', order: 3 },
      { name: 'Mercedes-Benz', order: 4 },
      { name: 'Audi', order: 5 },
      { name: 'Ford', order: 6 },
      { name: 'Renault', order: 7 },
      { name: 'Peugeot', order: 8 },
      { name: 'Opel', order: 9 },
      { name: 'Škoda', order: 10 },
    ];

    const modelsData = {
      Toyota: [
        'Corolla',
        'Camry',
        'RAV4',
        'Yaris',
        'Prius',
        'Land Cruiser',
        'Highlander',
        'C-HR',
        'Auris',
        'Avensis',
      ],
      Volkswagen: [
        'Golf',
        'Passat',
        'Polo',
        'Tiguan',
        'Jetta',
        'Touran',
        'Touareg',
        'T-Cross',
        'Arteon',
        'T-Roc',
      ],
      BMW: [
        '3 Series',
        '5 Series',
        'X3',
        'X5',
        '1 Series',
        '7 Series',
        'X1',
        '4 Series',
        'X6',
        '2 Series',
      ],
      'Mercedes-Benz': [
        'C-Class',
        'E-Class',
        'S-Class',
        'GLE',
        'GLC',
        'A-Class',
        'B-Class',
        'GLA',
        'CLA',
        'G-Class',
      ],
      Audi: ['A4', 'A6', 'Q5', 'Q7', 'A3', 'A5', 'Q3', 'TT', 'A8', 'Q8'],
      Ford: [
        'Focus',
        'Fiesta',
        'Mondeo',
        'Kuga',
        'Explorer',
        'Mustang',
        'Edge',
        'Transit',
        'Ranger',
        'EcoSport',
      ],
      Renault: [
        'Clio',
        'Megane',
        'Captur',
        'Kadjar',
        'Scenic',
        'Laguna',
        'Talisman',
        'Koleos',
        'Zoe',
        'Twingo',
      ],
      Peugeot: [
        '308',
        '208',
        '3008',
        '5008',
        '2008',
        '508',
        'Partner',
        'Expert',
        'Rifter',
        'Traveller',
      ],
      Opel: [
        'Corsa',
        'Astra',
        'Insignia',
        'Crossland X',
        'Grandland X',
        'Mokka',
        'Vivaro',
        'Combo',
        'Zafira',
        'Adam',
      ],
      Škoda: [
        'Octavia',
        'Superb',
        'Kodiaq',
        'Kamiq',
        'Karoq',
        'Fabia',
        'Scala',
        'Rapid',
        'Citigo',
        'Enyaq',
      ],
    };

    const brands: Brand[] = [];
    for (const brandData of brandsData) {
      let brand = await this.brandsRepository.findOne({
        where: { name: brandData.name },
      });
      if (!brand) {
        brand = this.brandsRepository.create({
          name: brandData.name,
          order: brandData.order,
        });
        brand = await this.brandsRepository.save(brand);
      } else {
        brand.order = brandData.order;
        brand = await this.brandsRepository.save(brand);
      }
      brands.push(brand);
    }

    for (const brand of brands) {
      const models = modelsData[brand.name] || [];
      for (let i = 0; i < models.length; i++) {
        const modelName = models[i];
        let model = await this.modelsRepository.findOne({
          where: { name: modelName, brand_id: brand.id },
        });
        if (!model) {
          model = this.modelsRepository.create({
            name: modelName,
            brand_id: brand.id,
            order: i + 1,
          });
          await this.modelsRepository.save(model);
        } else {
          model.order = i + 1;
          await this.modelsRepository.save(model);
        }
      }
    }

    return { brands: brands.length, models: Object.values(modelsData).flat().length };
  }
}
