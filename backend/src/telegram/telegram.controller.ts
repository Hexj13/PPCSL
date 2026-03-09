import { Body, Controller, HttpCode, HttpStatus, Logger, Post } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

import { TelegramService } from './telegram.service';
import type { TelegramUpdate } from './types/telegram.types';

@Controller('api/telegram')
@SkipThrottle()
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async webhook(@Body() body: TelegramUpdate): Promise<void> {
    try {
      await this.telegramService.handleUpdate(body);
    } catch (err) {
      this.logger.error('Telegram webhook handler error', err);
    }
  }
}
