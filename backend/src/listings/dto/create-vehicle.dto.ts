import { IsUUID, IsNumber, IsEnum, IsOptional, Min, Max, IsInt } from 'class-validator';
import { FuelType, TransmissionType, BodyType } from '../entities/vehicle.entity';

export class CreateVehicleDto {
  @IsUUID()
  brand_id: string;

  @IsUUID()
  model_id: string;

  @IsInt()
  @Min(1900)
  @Max(new Date().getFullYear() + 1)
  year: number;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  engine_displ_l?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  mileage_km?: number;

  @IsOptional()
  @IsEnum(FuelType)
  fuel?: FuelType;

  @IsOptional()
  @IsEnum(TransmissionType)
  transmission?: TransmissionType;

  @IsEnum(BodyType, { message: 'Типот на каросерија мора да биде валиден' })
  body_type: BodyType;

  @IsOptional()
  color?: string;

  @IsOptional()
  @IsInt()
  @Min(2)
  @Max(5)
  doors?: number;
}
