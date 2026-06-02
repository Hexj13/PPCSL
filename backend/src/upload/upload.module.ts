import { Module } from '@nestjs/common';

import { UploadQueueModule } from './infrastructure/upload-queue.module';
import { PlateDetectorService } from './plate-detector.service';
import { PlateMaskService } from './plate-mask.service';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

const uploadQueueImports = process.env.ENABLE_UPLOAD_QUEUE === 'true' ? [UploadQueueModule] : [];

@Module({
  imports: [...uploadQueueImports],
  controllers: [UploadController],
  providers: [PlateDetectorService, PlateMaskService, UploadService],
  exports: [UploadService],
})
export class UploadModule {}
