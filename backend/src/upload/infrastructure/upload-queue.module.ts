import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Listing } from '../../listings/entities/listing.entity';

import { UPLOAD_PROCESSING_QUEUE, UploadQueueProcessor } from './upload-queue.processor';
import { UploadQueueProducer } from './upload-queue.producer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Listing]),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') ?? 'redis://localhost:6379' },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: UPLOAD_PROCESSING_QUEUE }),
  ],
  providers: [UploadQueueProcessor, UploadQueueProducer],
  exports: [UploadQueueProducer],
})
export class UploadQueueModule {}
