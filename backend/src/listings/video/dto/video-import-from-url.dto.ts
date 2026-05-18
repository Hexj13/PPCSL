import { IsString, IsUrl, IsUUID, MaxLength } from 'class-validator';

export class VideoImportFromUrlDto {
  @IsUUID('4')
  listingId: string;

  @IsString()
  @IsUrl({ require_protocol: true }, { message: 'errors.video.invalidFormat' })
  @MaxLength(2048)
  videoUrl: string;
}
