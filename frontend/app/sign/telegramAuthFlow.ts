import {
  createTelegramAuthFlowId,
  logTelegramAuthEvent,
  type TelegramAuthDebugContext,
} from '@/app/sign/telegramAuthDebug';

export type TelegramLoginAuthResult = {
  id_token?: string;
  error?: string;
};

type TelegramAuthMessageData = {
  event?: string;
  result?: unknown;
  id_token?: unknown;
  token?: unknown;
  error?: string;
};

export type TelegramAuthPayloadShape = {
  resultKind: string;
  resultKeys?: string[];
  hasTopLevelIdToken: boolean;
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
            request_access?: Array<'phone' | 'write'>;
            lang?: string;
            nonce?: string;
          },
          callback?: (result: { id_token?: string; error?: string }) => void,
        ) => void;
        auth: (
          options: {
            client_id: number;
            request_access?: Array<'phone' | 'write'>;
            lang?: string;
            nonce?: string;
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

export function describeTelegramAuthPayloadShape(data: unknown): TelegramAuthPayloadShape | null {
  let message: TelegramAuthMessageData | null = null;
  try {
    const parsed = typeof data === 'string' ? (JSON.parse(data) as TelegramAuthMessageData) : data;
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    message = parsed as TelegramAuthMessageData;
  } catch {
    return null;
  }

  const result = message.result;
  const resultKeys =
    result && typeof result === 'object' && !Array.isArray(result)
      ? Object.keys(result as Record<string, unknown>)
      : undefined;

  return {
    resultKind: result === null ? 'null' : Array.isArray(result) ? 'array' : typeof result,
    resultKeys,
    hasTopLevelIdToken: typeof message.id_token === 'string',
    hasTopLevelError: Boolean(message.error),
    hasResultError:
      Boolean(result && typeof result === 'object' && 'error' in result) &&
      typeof (result as { error?: unknown }).error === 'string',
  };
}

function extractIdTokenFromUnknown(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed || null;
}

function extractIdTokenFromResult(result: unknown): string | null {
  const direct = extractIdTokenFromUnknown(result);
  if (direct) {
    return direct;
  }

  if (typeof result === 'string') {
    try {
      const nested = JSON.parse(result) as Record<string, unknown>;
      return (
        extractIdTokenFromUnknown(nested.id_token) ??
        extractIdTokenFromUnknown(nested.token) ??
        null
      );
    } catch {
      return null;
    }
  }

  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const objectResult = result as Record<string, unknown>;
    return (
      extractIdTokenFromUnknown(objectResult.id_token) ??
      extractIdTokenFromUnknown(objectResult.token) ??
      null
    );
  }

  return null;
}

function extractErrorFromMessage(message: TelegramAuthMessageData): string | null {
  if (typeof message.error === 'string' && message.error.trim()) {
    return message.error.trim();
  }

  const result = message.result;
  if (result && typeof result === 'object' && !Array.isArray(result)) {
    const resultError = (result as { error?: unknown }).error;
    if (typeof resultError === 'string' && resultError.trim()) {
      return resultError.trim();
    }
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

export function parseTelegramAuthMessage(data: unknown): TelegramLoginAuthResult | null {
  const parsedData =
    typeof data === 'string' ? (JSON.parse(data) as TelegramAuthMessageData) : data;
  if (!parsedData || typeof parsedData !== 'object') {
    return null;
  }
  const message = parsedData as TelegramAuthMessageData;
  if (message.event !== 'auth_result') {
    return null;
  }

  const messageError = extractErrorFromMessage(message);
  if (messageError) {
    return { error: messageError };
  }

  const idToken =
    extractIdTokenFromUnknown(message.id_token) ??
    extractIdTokenFromUnknown(message.token) ??
    extractIdTokenFromResult(message.result);

  if (idToken) {
    return { id_token: idToken };
  }

  if (isInterimAuthResult(message)) {
    return null;
  }

  return { error: 'missing id_token' };
}

type OpenTelegramAuthPopupOptions = {
  clientId: number;
  nonce: string;
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
  clientId: number;
  nonce: string;
  lang: string;
  redirectUri: string;
}): string {
  const params = [
    'response_type=post_message',
    `client_id=${encodeURIComponent(String(options.clientId))}`,
    `redirect_uri=${encodeURIComponent(options.redirectUri)}`,
    `scope=${encodeURIComponent('openid profile phone')}`,
    `nonce=${encodeURIComponent(options.nonce)}`,
    `lang=${encodeURIComponent(options.lang)}`,
  ];
  return `${TELEGRAM_OAUTH_ORIGIN}/auth?${params.join('&')}`;
}

function finishSdkAuthResult(
  options: OpenTelegramAuthPopupOptions,
  startedAt: number,
  result: { id_token?: string; error?: string },
  callback: (result: TelegramLoginAuthResult) => void,
): void {
  if (result.error) {
    const event =
      result.error === 'popup_closed' || result.error === 'popup_blocked'
        ? result.error
        : 'telegram_error';
    logTelegramAuthEvent(
      event,
      debugContext(options, startedAt, {
        telegramError: result.error,
      }),
    );
    callback({ error: result.error });
    return;
  }

  if (!result.id_token?.trim()) {
    logTelegramAuthEvent(
      'missing_id_token',
      debugContext(options, startedAt, {
        hasIdToken: false,
      }),
    );
    callback({ error: 'missing id_token' });
    return;
  }

  logTelegramAuthEvent(
    'id_token_received',
    debugContext(options, startedAt, {
      hasIdToken: true,
    }),
  );
  callback({ id_token: result.id_token });
}

function openTelegramAuthPopupWithSdk(
  options: OpenTelegramAuthPopupOptions,
  startedAt: number,
  callback: (result: TelegramLoginAuthResult) => void,
): boolean {
  const login = window.Telegram?.Login;
  if (!login?.auth) {
    return false;
  }

  logTelegramAuthEvent('popup_opened', debugContext(options, startedAt));

  login.auth(
    {
      client_id: options.clientId,
      nonce: options.nonce,
      lang: options.lang,
      request_access: ['phone'],
    },
    (result) => {
      finishSdkAuthResult(options, startedAt, result, callback);
    },
  );

  return true;
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
    hasTopLevelIdToken: payloadShape?.hasTopLevelIdToken,
    hasTopLevelError: payloadShape?.hasTopLevelError,
    hasResultError: payloadShape?.hasResultError,
  };
}

function processManualPopupAuthResult(params: {
  result: TelegramLoginAuthResult;
  options: OpenTelegramAuthPopupOptions;
  startedAt: number;
  messageOrigin: string;
  messageEvent: string;
  payloadShape: TelegramAuthPayloadShape | null;
  finish: (result: TelegramLoginAuthResult) => void;
}): void {
  const { result, options, startedAt, messageOrigin, messageEvent, payloadShape, finish } = params;
  const shapeContext = messageShapeContext(payloadShape);

  if (result.error === 'missing id_token') {
    logTelegramAuthEvent(
      'missing_id_token',
      debugContext(options, startedAt, {
        messageOrigin,
        messageEvent,
        hasResult: true,
        hasIdToken: false,
        ...shapeContext,
      }),
    );
    finish({ error: 'missing id_token' });
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
    'id_token_received',
    debugContext(options, startedAt, {
      messageOrigin,
      messageEvent,
      hasIdToken: true,
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
  finish: (result: TelegramLoginAuthResult) => void;
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
  callback: (result: TelegramLoginAuthResult) => void,
): void {
  const startedAt = Date.now();
  const pageOrigin = window.location.origin;

  logTelegramAuthEvent('popup_open_attempt', debugContext(options, startedAt));

  if (openTelegramAuthPopupWithSdk(options, startedAt, callback)) {
    return;
  }

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
      clientId: options.clientId,
      nonce: options.nonce,
      lang: options.lang,
      redirectUri,
    }),
    'telegram_oidc_login',
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

  const finish = (result: TelegramLoginAuthResult) => {
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
