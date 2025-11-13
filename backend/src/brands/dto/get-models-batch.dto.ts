import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class GetModelsBatchDto {
  @ApiProperty({
    type: [String],
    example: ['550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001'],
    description: 'Array of brand UUIDs',
  })
  @IsArray({ message: 'brandIds мора да биде низа' })
  @IsUUID(4, { each: true, message: 'Секој brandId мора да биде валиден UUID' })
  brandIds: string[];
}
