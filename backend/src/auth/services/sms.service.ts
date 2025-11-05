import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

import { SMS_MESSAGES } from '../../common/constants';
import { RedisService } from '../../common/redis.service';

@Injectable()
export class SmsService {
  private twilioClient: twilio.Twilio | null = null;
  private readonly senderId = 'Kupito';

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
    }
  }

  async sendVerificationCode(phoneNumber: string): Promise<void> {
    const code = this.generateCode();
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    const redisKey = `sms:code:${normalizedPhone}`;
    try {
      await this.redisService.set(redisKey, code, 600);
    } catch (error) {
      throw new BadRequestException('Грешка при зачувување на кодот. Обидете се повторно.');
    }

    if (!this.twilioClient) {
      console.log(`[TEST MODE] SMS код за ${normalizedPhone}: ${code}`);
      return;
    }

    try {
      await this.twilioClient.messages.create({
        from: this.senderId,
        to: normalizedPhone,
        body: SMS_MESSAGES.VERIFICATION_CODE(code),
      });
    } catch (error: unknown) {
      try {
        await this.redisService.del(redisKey);
      } catch {}
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Грешка при испраќање на SMS. Обидете се повторно.';
      throw new BadRequestException(errorMessage);
    }
  }

  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const redisKey = `sms:code:${normalizedPhone}`;

    let storedCode: string | null;
    try {
      storedCode = await this.redisService.get(redisKey);
    } catch (error) {
      return false;
    }

    if (!storedCode) {
      return false;
    }

    if (storedCode === code) {
      try {
        await this.redisService.del(redisKey);
      } catch {}
      return true;
    }

    return false;
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  normalizePhoneNumber(phone: string): string {
    let normalized = phone.replace(/\s+/g, '').replace(/[()-]/g, '');

    if (normalized.startsWith('0')) {
      normalized = '+389' + normalized.substring(1);
    } else if (!normalized.startsWith('+')) {
      normalized = '+389' + normalized;
    }

    return normalized;
  }
}
