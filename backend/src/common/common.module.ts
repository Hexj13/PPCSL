import { Global, Module } from '@nestjs/common';

import { I18nService } from './i18n/i18n.service';
import { RedisService } from './redis.service';

@Global()
@Module({
  providers: [RedisService, I18nService],
  exports: [RedisService, I18nService],
})
export class CommonModule {}
