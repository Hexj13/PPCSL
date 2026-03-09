import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { I18nService } from '../common/i18n/i18n.service';

import type { TelegramUpdate } from './types/telegram.types';
import { formatSupportCaption, formatSupportMessage } from './utils/message-formatter';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';
const MAX_TEXT_LENGTH = 3000;
const USER_MESSAGE_SEPARATOR = '\n\n—\n\n';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private configWarned = false;

  private messageRoRu(key: string): string {
    const ro = this.i18nService.translate(key, 'ro');
    const ru = this.i18nService.translate(key, 'ru');
    return `${ro}${USER_MESSAGE_SEPARATOR}${ru}`;
  }

  constructor(
    private readonly configService: ConfigService,
    private readonly i18nService: I18nService,
  ) {}

  private getToken(): string | undefined {
    return this.configService.get<string>('TELEGRAM_BOT_TOKEN') || process.env.TELEGRAM_BOT_TOKEN;
  }

  private getSupportChatId(): string | undefined {
    return (
      this.configService.get<string>('TELEGRAM_SUPPORT_CHAT_ID') ||
      process.env.TELEGRAM_SUPPORT_CHAT_ID
    );
  }

  private ensureConfig(): boolean {
    const token = this.getToken();
    const chatId = this.getSupportChatId();
    if (token && chatId) return true;
    if (!this.configWarned) {
      this.configWarned = true;
      this.logger.warn(
        'Telegram bot disabled: TELEGRAM_BOT_TOKEN or TELEGRAM_SUPPORT_CHAT_ID not set',
      );
    }
    return false;
  }

  private getApiUrl(method: string): string {
    const token = this.getToken();
    return `${TELEGRAM_API_BASE}${token}/${method}`;
  }

  private async request<T>(method: string, body: Record<string, unknown>): Promise<T> {
    const url = this.getApiUrl(method);
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { ok: boolean; result?: T; description?: string };
    if (!data.ok) {
      throw new Error(data.description || `Telegram API error: ${method}`);
    }
    return data.result as T;
  }

  async sendMessage(chatId: number, text: string): Promise<void> {
    if (!this.ensureConfig()) return;
    await this.request('sendMessage', { chat_id: chatId, text });
  }

  async sendPhoto(chatId: number, fileId: string, caption?: string): Promise<void> {
    if (!this.ensureConfig()) return;
    const body: Record<string, unknown> = { chat_id: chatId, photo: fileId };
    if (caption != null && caption !== '') body.caption = caption;
    await this.request('sendPhoto', body);
  }

  async setWebhook(url: string): Promise<void> {
    if (!this.ensureConfig()) return;
    await this.request('setWebhook', { url });
  }

  async getMe(): Promise<unknown> {
    if (!this.ensureConfig()) return null;
    return this.request('getMe', {});
  }

  async handleUpdate(update: TelegramUpdate): Promise<void> {
    if (!this.ensureConfig()) return;

    const message = update.message;
    if (!message) return;

    const from = message.from;
    const chatId = message.chat?.id;

    if (message.text) {
      const trimmed = message.text.trim();
      if (trimmed === '/start') {
        await this.sendMessage(chatId, this.messageRoRu('telegram.welcome'));
        return;
      }
      if (trimmed === '') {
        await this.sendMessage(chatId, this.messageRoRu('telegram.emptyMessage'));
        return;
      }
      const text = trimmed.length > MAX_TEXT_LENGTH ? trimmed.slice(0, MAX_TEXT_LENGTH) : trimmed;
      if (!from) return;
      const receivedAt = new Date().toISOString();
      const supportText = formatSupportMessage(from, text, receivedAt);
      const supportChatId = this.getSupportChatId();
      try {
        await this.sendMessage(Number(supportChatId), supportText);
        await this.sendMessage(chatId, this.messageRoRu('telegram.confirmation'));
      } catch (err) {
        this.logger.error('Failed to forward bug report to support chat', err);
        await this.sendMessage(chatId, this.messageRoRu('telegram.sendError'));
      }
      return;
    }

    if (message.photo && message.photo.length > 0) {
      if (!from) return;
      const receivedAt = new Date().toISOString();
      const caption = (message.caption || '').trim();
      const supportCaption = formatSupportCaption(from, caption, receivedAt);
      const fileId = message.photo[message.photo.length - 1].file_id;
      const supportChatId = this.getSupportChatId();
      try {
        await this.sendPhoto(Number(supportChatId), fileId, supportCaption);
        await this.sendMessage(chatId, this.messageRoRu('telegram.confirmation'));
      } catch (err) {
        this.logger.error('Failed to forward photo bug report to support chat', err);
        await this.sendMessage(chatId, this.messageRoRu('telegram.sendError'));
      }
      return;
    }

    await this.sendMessage(chatId, this.messageRoRu('telegram.unsupportedType'));
  }
}
