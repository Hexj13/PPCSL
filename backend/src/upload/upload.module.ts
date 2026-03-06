import { Module } from '@nestjs/common';

import { PlateDetectorService } from './plate-detector.service';
import { PlateMaskService } from './plate-mask.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  controllers: [UploadController],
  providers: [PlateDetectorService, PlateMaskService, UploadService],
  exports: [UploadService],
})
export class UploadModule {}
