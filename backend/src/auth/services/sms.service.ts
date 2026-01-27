import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

import { SMS_MESSAGES } from '../../common/constants';
import { RedisService } from '../../common/redis.service';

@Injectable()
export class SmsService {
  private twilioClient: twilio.Twilio | null = null;
  private readonly messagingServiceSid: string | null = null;
  private readonly fromNumber: string | null = null;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
  ) {
    const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
    const messagingServiceSid = this.configService.get('TWILIO_MESSAGING_SERVICE_SID');
    const fromNumber = this.configService.get('TWILIO_FROM_NUMBER');

    if (accountSid && authToken) {
      this.twilioClient = twilio(accountSid, authToken);
      this.messagingServiceSid = messagingServiceSid || null;
      this.fromNumber = fromNumber || null;
    } else {
      this.twilioClient = null;
    }
  }

  async sendVerificationCode(phoneNumber: string): Promise<void> {
    const code = this.generateCode();
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    const redisKey = `sms:code:${normalizedPhone}`;
    try {
      await this.redisService.set(redisKey, code, 600);
    } catch {
      throw new BadRequestException('errors.codeSaveError');
    }

    if (!this.twilioClient) {
      return;
    }

    try {
      const messageOptions: {
        to: string;
        body: string;
        messagingServiceSid?: string;
        from?: string;
      } = {
        to: normalizedPhone,
        body: SMS_MESSAGES.VERIFICATION_CODE(code),
      };

      if (this.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.messagingServiceSid;
      } else if (this.fromNumber) {
        messageOptions.from = this.fromNumber;
      } else {
        throw new Error('TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER must be configured');
      }

      await this.twilioClient.messages.create(messageOptions);
    } catch (error: unknown) {
      try {
        await this.redisService.del(redisKey);
      } catch {
        // Ignore cleanup errors
      }
      const errorMessage = error instanceof Error ? error.message : 'errors.smsSendError';
      const nodeEnv = this.configService.get('NODE_ENV');
      if (nodeEnv === 'test' || nodeEnv === 'development' || nodeEnv === 'stage') {
        return;
      }
      throw new BadRequestException(errorMessage);
    }
  }

  async sendPasswordResetCode(phoneNumber: string): Promise<void> {
    const code = this.generateCode();
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);

    const redisKey = `sms:reset:${normalizedPhone}`;
    try {
      await this.redisService.set(redisKey, code, 600);
    } catch {
      throw new BadRequestException('errors.codeSaveError');
    }

    if (!this.twilioClient) {
      return;
    }

    try {
      const messageOptions: {
        to: string;
        body: string;
        messagingServiceSid?: string;
        from?: string;
      } = {
        to: normalizedPhone,
        body: SMS_MESSAGES.PASSWORD_RESET_CODE(code),
      };

      if (this.messagingServiceSid) {
        messageOptions.messagingServiceSid = this.messagingServiceSid;
      } else if (this.fromNumber) {
        messageOptions.from = this.fromNumber;
      } else {
        throw new Error('TWILIO_MESSAGING_SERVICE_SID or TWILIO_FROM_NUMBER must be configured');
      }

      await this.twilioClient.messages.create(messageOptions);
    } catch (error: unknown) {
      try {
        await this.redisService.del(redisKey);
      } catch {
        // Ignore cleanup errors
      }
      const errorMessage = error instanceof Error ? error.message : 'errors.smsSendError';
      const nodeEnv = this.configService.get('NODE_ENV');
      if (nodeEnv === 'test' || nodeEnv === 'development' || nodeEnv === 'stage') {
        return;
      }
      throw new BadRequestException(errorMessage);
    }
  }

  async verifyPasswordResetCode(phoneNumber: string, code: string): Promise<boolean> {
    const nodeEnv = this.configService.get('NODE_ENV') || process.env.NODE_ENV || 'development';
    const isStageOrDev = nodeEnv === 'stage' || nodeEnv === 'development';
    const isTest = nodeEnv === 'test';

    if ((isStageOrDev || isTest) && code === '000000') {
      return true;
    }

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const redisKey = `sms:reset:${normalizedPhone}`;

    let storedCode: string | null;
    try {
      storedCode = await this.redisService.get(redisKey);
    } catch {
      return false;
    }

    if (!storedCode) {
      return false;
    }

    if (storedCode === code) {
      return true;
    }

    return false;
  }

  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    const nodeEnv = this.configService.get('NODE_ENV') || process.env.NODE_ENV || 'development';
    const isStageOrDev = nodeEnv === 'stage' || nodeEnv === 'development';
    const isTest = nodeEnv === 'test';

    if ((isStageOrDev || isTest) && code === '000000') {
      return true;
    }

    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const redisKey = `sms:code:${normalizedPhone}`;

    let storedCode: string | null;
    try {
      storedCode = await this.redisService.get(redisKey);
    } catch {
      return false;
    }

    if (!storedCode) {
      return false;
    }

    if (storedCode === code) {
      try {
        await this.redisService.del(redisKey);
      } catch {
        // Ignore cleanup errors
      }
      return true;
    }

    return false;
  }

  async clearPasswordResetCode(phoneNumber: string): Promise<void> {
    const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
    const redisKey = `sms:reset:${normalizedPhone}`;
    try {
      await this.redisService.del(redisKey);
    } catch {
      // Ignore cleanup errors
    }
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  normalizePhoneNumber(phone: string): string {
    let normalized = phone.replace(/\s+/g, '').replace(/[()-]/g, '');

    if (normalized.startsWith('0')) {
      normalized = '+373' + normalized.substring(1);
    } else if (!normalized.startsWith('+')) {
      normalized = '+373' + normalized;
    }

    return normalized;
  }
}
