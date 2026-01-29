import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class GetSearchMetadataQueryDto {
  @ApiPropertyOptional({ example: 'citroen', description: 'Brand slug from URL' })
  @IsOptional()
  @IsString()
  brand?: string;

  @ApiPropertyOptional({
    example: 'c-elysee',
    description: 'Model slug(s) from URL, comma-separated',
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ enum: ['car', 'truck', 'moto'], example: 'car' })
  @IsOptional()
  @IsEnum(['car', 'truck', 'moto'])
  vehicleType?: 'car' | 'truck' | 'moto';
}
