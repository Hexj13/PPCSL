import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

import { SMS_MESSAGES } from '../../../common/constants';
import { RedisService } from '../../../common/redis.service';
import { PhoneService } from '../../domain/services/phone.service';

const SMS_PER_HOUR = 3;
const CODE_FAIL_MAX = 3;
const SEND_HOUR_TTL_SECONDS = 3600;
const CODE_TTL_SECONDS = 600;

@Injectable()
export class SmsService {
  private twilioClient: twilio.Twilio | null = null;
  private readonly messagingServiceSid: string | null = null;
  private readonly fromNumber: string | null = null;

  constructor(
    private configService: ConfigService,
    private redisService: RedisService,
    private phoneService: PhoneService,
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

    await this.consumeSmsSendQuota(normalizedPhone);
    await this.redisService.del(this.codeFailKey(normalizedPhone));

    const redisKey = `sms:code:${normalizedPhone}`;
    try {
      await this.redisService.set(redisKey, code, CODE_TTL_SECONDS);
    } catch {
      await this.releaseSmsSendQuotaSlot(normalizedPhone);
      throw new BadRequestException('errors.codeSaveError');
    }

    if (!this.twilioClient) {
      return;
    }

    if (this.isSmsOutboundDisabled()) {
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

    await this.consumeSmsSendQuota(normalizedPhone);
    await this.redisService.del(this.resetFailKey(normalizedPhone));

    const redisKey = `sms:reset:${normalizedPhone}`;
    try {
      await this.redisService.set(redisKey, code, CODE_TTL_SECONDS);
    } catch {
      await this.releaseSmsSendQuotaSlot(normalizedPhone);
      throw new BadRequestException('errors.codeSaveError');
    }

    if (!this.twilioClient) {
      return;
    }

    if (this.isSmsOutboundDisabled()) {
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
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      await this.redisService.del(this.resetFailKey(normalizedPhone));
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
      await this.redisService.del(this.resetFailKey(normalizedPhone));
      return true;
    }

    await this.incrementWrongCodeFail(this.resetFailKey(normalizedPhone));
    return false;
  }

  async verifyCode(phoneNumber: string, code: string): Promise<boolean> {
    const nodeEnv = this.configService.get('NODE_ENV') || process.env.NODE_ENV || 'development';
    const isStageOrDev = nodeEnv === 'stage' || nodeEnv === 'development';
    const isTest = nodeEnv === 'test';

    if ((isStageOrDev || isTest) && code === '000000') {
      const normalizedPhone = this.normalizePhoneNumber(phoneNumber);
      await this.redisService.del(this.codeFailKey(normalizedPhone));
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
      await this.redisService.del(this.codeFailKey(normalizedPhone));
      return true;
    }

    await this.incrementWrongCodeFail(this.codeFailKey(normalizedPhone));
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
    await this.redisService.del(this.resetFailKey(normalizedPhone));
  }

  normalizePhoneNumber(phone: string): string {
    return this.phoneService.normalize(phone);
  }

  private sendHourKey(normalizedPhone: string): string {
    return `sms:send-hour:${normalizedPhone}`;
  }

  private codeFailKey(normalizedPhone: string): string {
    return `sms:code-fail:${normalizedPhone}`;
  }

  private resetFailKey(normalizedPhone: string): string {
    return `sms:reset-fail:${normalizedPhone}`;
  }

  private isSmsOutboundDisabled(): boolean {
    const nodeEnv =
      this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
    if (nodeEnv === 'production') {
      return false;
    }
    const flag = this.configService.get<string>('SMS_OUTBOUND_DISABLED');
    return flag === 'true' || flag === '1';
  }

  private isSmsHourlyRateLimitBypassed(): boolean {
    const nodeEnv =
      this.configService.get<string>('NODE_ENV') ?? process.env.NODE_ENV ?? 'development';
    if (nodeEnv !== 'development') {
      return false;
    }
    const flag = this.configService.get<string>('DISABLE_SMS_SEND_RATE_LIMIT');
    return flag === 'true' || flag === '1';
  }

  private async consumeSmsSendQuota(normalizedPhone: string): Promise<void> {
    if (this.isSmsHourlyRateLimitBypassed()) {
      return;
    }
    const key = this.sendHourKey(normalizedPhone);
    const n = await this.redisService.incr(key);
    if (n === 1) {
      await this.redisService.expire(key, SEND_HOUR_TTL_SECONDS);
    }
    if (n > SMS_PER_HOUR) {
      await this.redisService.decr(key);
      throw new BadRequestException('errors.smsHourlyLimit');
    }
  }

  private async releaseSmsSendQuotaSlot(normalizedPhone: string): Promise<void> {
    try {
      await this.redisService.decr(this.sendHourKey(normalizedPhone));
    } catch {
      // Ignore
    }
  }

  private async incrementWrongCodeFail(failKey: string): Promise<void> {
    const n = await this.redisService.incr(failKey);
    if (n === 1) {
      await this.redisService.expire(failKey, CODE_TTL_SECONDS);
    }
    if (n >= CODE_FAIL_MAX) {
      throw new BadRequestException('errors.maxSmsCodeAttempts');
    }
  }

  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}
