import { Injectable, Logger } from '@nestjs/common';

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
  model_trim: string;
  model_year: string;
  model_body: string;
  model_engine_position: string;
  model_engine_cc: string;
  model_engine_cyl: string;
  model_engine_type: string;
  model_engine_valves_per_cyl: string;
  model_engine_power_ps: string;
  model_engine_power_rpm: string;
  model_engine_torque_nm: string;
  model_engine_torque_rpm: string;
  model_engine_bore_mm: string;
  model_engine_stroke_mm: string;
  model_engine_compression: string;
  model_engine_fuel: string;
  model_top_speed_kph: string;
  model_0_to_100_kph: string;
  model_drive: string;
  model_transmission_type: string;
  model_seats: string;
  model_doors: string;
  model_weight_kg: string;
  model_length_mm: string;
  model_width_mm: string;
  model_height_mm: string;
  model_wheelbase_mm: string;
  model_lkm_hwy: string;
  model_lkm_mixed: string;
  model_lkm_city: string;
  model_fuel_cap_l: string;
  model_sold_in_us: string;
  model_co2: string;
  model_make_display: string;
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

@Injectable()
export class CarQueryService {
  private readonly logger = new Logger(CarQueryService.name);
  private readonly baseUrl = 'https://www.carqueryapi.com/api/0.3';

  async getAllMakes(): Promise<string[]> {
    try {
      const url = `${this.baseUrl}/?cmd=getMakes`;
      this.logger.log('Fetching all makes from CarQuery API...');

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = (await response.json()) as CarQueryResponse;

      if (data.Makes && data.Makes.length > 0) {
        const uniqueMakes = [...new Set(data.Makes.map((m) => m.make_display))].sort();
        this.logger.log(`Successfully fetched ${uniqueMakes.length} makes`);
        return uniqueMakes;
      }

      return [];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching makes from CarQuery API: ${errorMessage}`);
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

  async getAllMakesWithModels(): Promise<Map<string, string[]>> {
    const makesWithModels = new Map<string, string[]>();

    try {
      const makes = await this.getAllMakes();
      this.logger.log(`Processing ${makes.length} makes...`);

      let processed = 0;
      for (const make of makes) {
        const models = await this.getModelsForMake(make);

        if (models.length > 0) {
          makesWithModels.set(make, models);
        }

        processed++;
        if (processed % 20 === 0) {
          this.logger.log(`Processed ${processed}/${makes.length} makes...`);
          await this.delay(1000);
        } else {
          await this.delay(200);
        }
      }

      this.logger.log(`Successfully processed ${makes.length} makes with models`);
      return makesWithModels;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error fetching makes with models: ${errorMessage}`);
      throw error;
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
