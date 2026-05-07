import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, Max, MaxLength, Min } from 'class-validator';

import { LISTING_VIDEO_ALLOWED_MIME, MAX_LISTING_VIDEO_BYTES } from '../listing-video.constants';

const allowedMime = [...LISTING_VIDEO_ALLOWED_MIME];

export class VideoUploadInitDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LISTING_VIDEO_BYTES)
  fileSize: number;

  @IsString()
  @MaxLength(255)
  fileName: string;

  @IsString()
  @IsIn(allowedMime, { message: 'errors.video.invalidFormat' })
  contentType: string;
}
