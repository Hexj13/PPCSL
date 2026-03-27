import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class GetTireSearchMetadataQueryDto {
  @ApiPropertyOptional({
    example: 'uuid-one,uuid-two',
    description: 'Comma-separated tire brand UUIDs from URL',
  })
  @IsOptional()
  @IsString()
  tire_brand_ids?: string;

  @ApiPropertyOptional({
    example: 'uuid-one',
    description: 'Comma-separated tire model UUIDs from URL',
  })
  @IsOptional()
  @IsString()
  tire_model_ids?: string;
}
