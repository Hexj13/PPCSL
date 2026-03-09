import type { TelegramUser } from '../types/telegram.types';

const NAME_FALLBACK = '-';
const USERNAME_FALLBACK = '-';

function formatName(from: TelegramUser): string {
  const first = from.first_name?.trim() || '';
  const last = from.last_name?.trim() || '';
  const name = [first, last].filter(Boolean).join(' ');
  return name || NAME_FALLBACK;
}

function formatUsername(from: TelegramUser): string {
  const u = from.username?.trim();
  return u ? `@${u}` : USERNAME_FALLBACK;
}

export function formatSupportMessage(from: TelegramUser, text: string, receivedAt: string): string {
  const name = formatName(from);
  const username = formatUsername(from);
  return `New bug report

From:
Name: ${name}
Username: ${username}
Telegram ID: ${from.id}

Message:
${text}

Received at:
${receivedAt}`;
}

export function formatSupportCaption(
  from: TelegramUser,
  caption: string,
  receivedAt: string,
): string {
  const name = formatName(from);
  const username = formatUsername(from);
  const messagePart = caption.trim() || '(no caption)';
  return `New bug report

From:
Name: ${name}
Username: ${username}
Telegram ID: ${from.id}

Message:
${messagePart}

Received at:
${receivedAt}`;
}
