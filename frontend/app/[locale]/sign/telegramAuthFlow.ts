import {
  createTelegramAuthFlowId,
  logTelegramAuthEvent,
  type TelegramAuthDebugContext,
} from '@/app/[locale]/sign/telegramAuthDebug';

export type TelegramLoginWidgetUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
};

export type TelegramLoginResult = {
  user?: TelegramLoginWidgetUser;
  error?: string;
};

type TelegramAuthMessageData = {
  event?: string;
  result?: unknown;
  error?: string;
};

export type TelegramAuthPayloadShape = {
  resultKind: string;
  resultKeys?: string[];
  hasUser: boolean;
  hasTopLevelError: boolean;
  hasResultError: boolean;
};

export const TELEGRAM_OAUTH_ORIGIN = 'https://oauth.telegram.org';

const POPUP_CLOSED_GRACE_MS = 500;

declare global {
  interface Window {
    Telegram?: {
      Login?: {
        init: (
          options: {
            client_id: number;
            request_access?: Array<'write'>;
            lang?: string;
          },
          callback?: (result: { id_token?: string; error?: string }) => void,
        ) => void;
        auth: (
          options: {
            client_id: number;
            request_access?: Array<'write'>;
            lang?: string;
          },
          callback: (result: { id_token?: string; error?: string }) => void,
        ) => void;
      };
    };
  }
}

export function isTrustedTelegramMessageOrigin(origin: string, pageOrigin: string): boolean {
  return origin === TELEGRAM_OAUTH_ORIGIN || origin === pageOrigin;
}

export function isTrustedTelegramMessageSource(
  event: MessageEvent,
  popup: Window | null,
  pageOrigin: string,
): boolean {
  if (!popup) {
    return false;
  }
  if (event.source === popup) {
    return true;
  }
  return event.origin === pageOrigin;
}

function toAuthMessage(data: unknown): TelegramAuthMessageData | null {
  try {
    const parsed = typeof data === 'string' ? (JSON.parse(data) as TelegramAuthMessageData) : data;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    return parsed as TelegramAuthMessageData;
  } catch {
    return null;
  }
}

function toResultObject(result: unknown): Record<string, unknown> | null {
  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    return result as Record<string, unknown>;
  }
  return null;
}

export function describeTelegramAuthPayloadShape(data: unknown): TelegramAuthPayloadShape | null {
  const message = toAuthMessage(data);
  if (!message) {
    return null;
  }

  const resultObject = toResultObject(message.result);
  const resultKeys = resultObject ? Object.keys(resultObject) : undefined;

  return {
    resultKind:
      message.result === null
        ? 'null'
        : Array.isArray(message.result)
          ? 'array'
          : typeof message.result,
    resultKeys,
    hasUser: extractWidgetUser(resultObject) != null,
    hasTopLevelError: Boolean(message.error),
    hasResultError: Boolean(
      resultObject && typeof resultObject.error === 'string' && resultObject.error.trim(),
    ),
  };
}

function extractWidgetUser(result: Record<string, unknown> | null): TelegramLoginWidgetUser | null {
  if (!result) {
    return null;
  }
  const id = result.id;
  const hash = result.hash;
  const authDate = result.auth_date;
  const numericId = typeof id === 'number' ? id : typeof id === 'string' ? Number(id) : NaN;
  const numericAuthDate =
    typeof authDate === 'number' ? authDate : typeof authDate === 'string' ? Number(authDate) : NaN;
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return null;
  }
  if (typeof hash !== 'string' || !hash.trim()) {
    return null;
  }
  if (!Number.isFinite(numericAuthDate) || numericAuthDate <= 0) {
    return null;
  }

  const user: TelegramLoginWidgetUser = {
    id: numericId,
    auth_date: numericAuthDate,
    hash: hash.trim(),
  };
  if (typeof result.first_name === 'string') {
    user.first_name = result.first_name;
  }
  if (typeof result.last_name === 'string') {
    user.last_name = result.last_name;
  }
  if (typeof result.username === 'string') {
    user.username = result.username;
  }
  if (typeof result.photo_url === 'string') {
    user.photo_url = result.photo_url;
  }
  return user;
}

function extractErrorFromMessage(message: TelegramAuthMessageData): string | null {
  if (typeof message.error === 'string' && message.error.trim()) {
    return message.error.trim();
  }
  const resultObject = toResultObject(message.result);
  if (resultObject && typeof resultObject.error === 'string' && resultObject.error.trim()) {
    return resultObject.error.trim();
  }
  return null;
}

function isInterimAuthResult(message: TelegramAuthMessageData): boolean {
  const { result } = message;
  if (result == null) {
    return true;
  }
  if (typeof result === 'string' && !result.trim()) {
    return true;
  }
  if (typeof result === 'object' && !Array.isArray(result) && Object.keys(result).length === 0) {
    return true;
  }
  return false;
}

export function parseTelegramAuthMessage(data: unknown): TelegramLoginResult | null {
  const message = toAuthMessage(data);
  if (!message || message.event !== 'auth_result') {
    return null;
  }

  const messageError = extractErrorFromMessage(message);
  if (messageError) {
    return { error: messageError };
  }

  const user = extractWidgetUser(toResultObject(message.result));
  if (user) {
    return { user };
  }

  if (isInterimAuthResult(message)) {
    return null;
  }

  return { error: 'missing user data' };
}

type OpenTelegramAuthPopupOptions = {
  botId: number;
  lang: string;
  debug: Pick<TelegramAuthDebugContext, 'flowId' | 'locale' | 'tab' | 'hasPreferredType'>;
};

function elapsedMs(startedAt: number): number {
  return Date.now() - startedAt;
}

function debugContext(
  options: OpenTelegramAuthPopupOptions,
  startedAt: number,
  extra: Partial<TelegramAuthDebugContext> = {},
): TelegramAuthDebugContext {
  return {
    flowId: options.debug.flowId,
    locale: options.debug.locale,
    tab: options.debug.tab,
    hasPreferredType: options.debug.hasPreferredType,
    origin: window.location.origin,
    elapsedMs: elapsedMs(startedAt),
    ...extra,
  };
}

function buildTelegramAuthUrl(options: {
  botId: number;
  redirectUri: string;
  origin: string;
  lang: string;
}): string {
  const params = [
    'response_type=post_message',
    `client_id=${encodeURIComponent(String(options.botId))}`,
    `redirect_uri=${encodeURIComponent(options.redirectUri)}`,
    `origin=${encodeURIComponent(options.origin)}`,
    `scope=${encodeURIComponent('openid profile phone')}`,
    `request_access=${encodeURIComponent('write')}`,
    `lang=${encodeURIComponent(options.lang)}`,
  ];
  return `${TELEGRAM_OAUTH_ORIGIN}/auth?${params.join('&')}`;
}

function getTelegramMessageEventLabel(data: unknown): string {
  if (data && typeof data === 'object' && 'event' in data) {
    return String((data as { event?: unknown }).event ?? '');
  }
  return typeof data === 'string' ? 'string_payload' : 'unknown';
}

function messageShapeContext(
  payloadShape: TelegramAuthPayloadShape | null,
): Partial<TelegramAuthDebugContext> {
  return {
    resultKind: payloadShape?.resultKind,
    resultKeys: payloadShape?.resultKeys,
    hasUser: payloadShape?.hasUser,
    hasTopLevelError: payloadShape?.hasTopLevelError,
    hasResultError: payloadShape?.hasResultError,
  };
}

function processManualPopupAuthResult(params: {
  result: TelegramLoginResult;
  options: OpenTelegramAuthPopupOptions;
  startedAt: number;
  messageOrigin: string;
  messageEvent: string;
  payloadShape: TelegramAuthPayloadShape | null;
  finish: (result: TelegramLoginResult) => void;
}): void {
  const { result, options, startedAt, messageOrigin, messageEvent, payloadShape, finish } = params;
  const shapeContext = messageShapeContext(payloadShape);

  if (result.error === 'missing user data') {
    logTelegramAuthEvent(
      'missing_user_data',
      debugContext(options, startedAt, {
        messageOrigin,
        messageEvent,
        hasResult: true,
        hasUser: false,
        ...shapeContext,
      }),
    );
    finish({ error: 'missing user data' });
    return;
  }

  if (result.error) {
    logTelegramAuthEvent(
      'telegram_error',
      debugContext(options, startedAt, {
        messageOrigin,
        messageEvent,
        telegramError: result.error,
        ...shapeContext,
      }),
    );
    finish(result);
    return;
  }

  logTelegramAuthEvent(
    'user_data_received',
    debugContext(options, startedAt, {
      messageOrigin,
      messageEvent,
      hasUser: true,
      resultKind: payloadShape?.resultKind,
    }),
  );
  finish(result);
}

function handleManualPopupMessage(params: {
  event: MessageEvent;
  options: OpenTelegramAuthPopupOptions;
  startedAt: number;
  pageOrigin: string;
  popup: Window | null;
  finish: (result: TelegramLoginResult) => void;
}): void {
  const { event, options, startedAt, pageOrigin, popup, finish } = params;
  const payloadShape = describeTelegramAuthPayloadShape(event.data);
  const messageEvent = getTelegramMessageEventLabel(event.data);
  const shapeContext = messageShapeContext(payloadShape);
  const messageOrigin = event.origin;

  if (!isTrustedTelegramMessageOrigin(messageOrigin, pageOrigin)) {
    logTelegramAuthEvent(
      'message_ignored_origin',
      debugContext(options, startedAt, {
        messageOrigin,
        messageEvent,
        ...shapeContext,
      }),
    );
    return;
  }

  if (!isTrustedTelegramMessageSource(event, popup, pageOrigin)) {
    logTelegramAuthEvent(
      'message_ignored_source',
      debugContext(options, startedAt, {
        messageOrigin,
        messageEvent,
        ...shapeContext,
      }),
    );
    return;
  }

  logTelegramAuthEvent(
    'message_received',
    debugContext(options, startedAt, {
      messageOrigin,
      messageEvent,
      hasResult: event.data != null,
      ...shapeContext,
    }),
  );

  try {
    const result = parseTelegramAuthMessage(event.data);
    if (!result) {
      return;
    }
    processManualPopupAuthResult({
      result,
      options,
      startedAt,
      messageOrigin,
      messageEvent,
      payloadShape,
      finish,
    });
  } catch {
    logTelegramAuthEvent(
      'message_parse_failed',
      debugContext(options, startedAt, {
        messageOrigin,
        messageEvent,
        ...shapeContext,
      }),
    );
    finish({ error: 'malformed_response' });
  }
}

export function openTelegramAuthPopup(
  options: OpenTelegramAuthPopupOptions,
  callback: (result: TelegramLoginResult) => void,
): void {
  const startedAt = Date.now();
  const pageOrigin = window.location.origin;

  logTelegramAuthEvent('popup_open_attempt', debugContext(options, startedAt));

  const redirectUri = `${pageOrigin}${window.location.pathname}`;
  const width = 550;
  const height = 650;
  const left = Math.max(0, (window.screen.width - width) / 2);
  const top = Math.max(0, (window.screen.height - height) / 2);
  const features = [
    `width=${width}`,
    `height=${height}`,
    `left=${left}`,
    `top=${top}`,
    'status=0',
    'location=0',
    'menubar=0',
    'toolbar=0',
  ].join(',');

  const popup = window.open(
    buildTelegramAuthUrl({
      botId: options.botId,
      redirectUri,
      origin: pageOrigin,
      lang: options.lang,
    }),
    'telegram_login',
    features,
  );

  if (!popup) {
    logTelegramAuthEvent('popup_blocked', debugContext(options, startedAt));
    callback({ error: 'popup_blocked' });
    return;
  }

  logTelegramAuthEvent('popup_opened', debugContext(options, startedAt));

  let completed = false;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  let closedGraceTimer: ReturnType<typeof setTimeout> | null = null;

  const cleanup = () => {
    window.removeEventListener('message', handleMessage);
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    if (closedGraceTimer) {
      clearTimeout(closedGraceTimer);
      closedGraceTimer = null;
    }
  };

  const finish = (result: TelegramLoginResult) => {
    if (completed) {
      return;
    }
    completed = true;
    cleanup();
    callback(result);
  };

  function handleMessage(event: MessageEvent) {
    handleManualPopupMessage({
      event,
      options,
      startedAt,
      pageOrigin,
      popup,
      finish,
    });
  }

  const checkClosed = () => {
    if (popup.closed) {
      if (!closedGraceTimer) {
        closedGraceTimer = setTimeout(() => {
          if (!completed) {
            logTelegramAuthEvent('popup_closed', debugContext(options, startedAt));
            finish({ error: 'popup_closed' });
          }
        }, POPUP_CLOSED_GRACE_MS);
      }
      return;
    }
    closeTimer = setTimeout(checkClosed, 200);
  };

  window.addEventListener('message', handleMessage);
  popup.focus();
  checkClosed();
}

export { createTelegramAuthFlowId };
