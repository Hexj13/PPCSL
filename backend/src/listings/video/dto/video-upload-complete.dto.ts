import { Type } from 'class-transformer';
import { IsArray, IsInt, IsString, Min, ValidateNested } from 'class-validator';

export class VideoUploadPartDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  PartNumber: number;

  @IsString()
  ETag: string;
}

export class VideoUploadCompleteDto {
  @IsString()
  uploadId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VideoUploadPartDto)
  parts: VideoUploadPartDto[];
}

export class StagedVideoUploadCompleteDto extends VideoUploadCompleteDto {
  @IsString()
  stagedVideoToken: string;
}

export class StagedVideoStatusDto {
  @IsString()
  stagedVideoToken: string;
}
