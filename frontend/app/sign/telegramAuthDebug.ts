import * as Sentry from '@sentry/nextjs';

export type TelegramAuthDebugEvent =
  | 'nonce_requested'
  | 'nonce_received'
  | 'nonce_request_failed'
  | 'popup_open_attempt'
  | 'popup_opened'
  | 'popup_blocked'
  | 'message_received'
  | 'message_ignored_origin'
  | 'message_ignored_source'
  | 'message_parse_failed'
  | 'missing_id_token'
  | 'telegram_error'
  | 'id_token_received'
  | 'backend_submit_started'
  | 'backend_submit_success'
  | 'backend_submit_failed'
  | 'me_sync_failed'
  | 'finish_oauth_started'
  | 'popup_closed';

export type TelegramAuthDebugContext = {
  flowId: string;
  locale?: string;
  tab?: string;
  hasPreferredType?: boolean;
  origin?: string;
  messageOrigin?: string;
  messageEvent?: string;
  hasResult?: boolean;
  hasIdToken?: boolean;
  backendStatus?: number;
  backendErrorKey?: string;
  elapsedMs?: number;
  telegramError?: string;
};

const WARN_EVENTS = new Set<TelegramAuthDebugEvent>([
  'nonce_request_failed',
  'popup_blocked',
  'message_ignored_origin',
  'message_ignored_source',
  'message_parse_failed',
  'missing_id_token',
  'telegram_error',
  'backend_submit_failed',
  'me_sync_failed',
  'popup_closed',
]);

function createFlowId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `tg-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createTelegramAuthFlowId(): string {
  return createFlowId();
}

export function logTelegramAuthEvent(
  event: TelegramAuthDebugEvent,
  context: TelegramAuthDebugContext,
): void {
  const payload = { event: `telegram_auth_${event}`, ...context };
  const level = WARN_EVENTS.has(event) ? 'warning' : 'info';

  console.warn('[telegram-auth]', payload);

  try {
    Sentry.addBreadcrumb({
      category: 'telegram_auth',
      message: event,
      level,
      data: context,
    });
  } catch {
    // Sentry may be unavailable in tests
  }
}
