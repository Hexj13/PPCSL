import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsUUID } from 'class-validator';

export class CheckBatchDto {
  @ApiProperty({
    example: ['550e8400-e29b-41d4-a716-446655440000', '660e8400-e29b-41d4-a716-446655440001'],
    description: 'Array of listing UUIDs',
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  listingIds: string[];
}
