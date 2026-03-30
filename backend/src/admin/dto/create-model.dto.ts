import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateModelDto {
  @IsUUID()
  brandId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsIn(['car', 'truck', 'moto', 'tire'], { each: true })
  vehicleTypes: ('car' | 'truck' | 'moto' | 'tire')[];
}
