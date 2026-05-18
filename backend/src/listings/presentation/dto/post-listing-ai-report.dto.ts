import { IsIn, IsOptional, IsString } from 'class-validator';

export class PostListingAiReportDto {
  @IsOptional()
  @IsString()
  @IsIn(['ru', 'ro'])
  language?: 'ru' | 'ro';
}
