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

export const TELEGRAM_OAUTH_ORIGIN = 'https://oauth.telegram.org';

const POPUP_CLOSED_GRACE_MS = 500;

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
  if (message.error) {
    return { error: message.error };
  }
  const result = message.result;
  const idToken =
    typeof message.id_token === 'string'
      ? message.id_token
      : typeof message.token === 'string'
        ? message.token
        : typeof result === 'string'
          ? result
          : result && typeof result === 'object' && 'id_token' in result
            ? (result as { id_token?: unknown }).id_token
            : result && typeof result === 'object' && 'token' in result
              ? (result as { token?: unknown }).token
              : null;
  return typeof idToken === 'string' && idToken.trim()
    ? { id_token: idToken }
    : { error: 'missing id_token' };
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

export function openTelegramAuthPopup(
  options: OpenTelegramAuthPopupOptions,
  callback: (result: TelegramLoginAuthResult) => void,
): void {
  const startedAt = Date.now();
  const pageOrigin = window.location.origin;

  logTelegramAuthEvent('popup_open_attempt', debugContext(options, startedAt));

  const redirectUri = `${pageOrigin}${window.location.pathname}`;
  const params = new URLSearchParams({
    response_type: 'post_message',
    client_id: String(options.clientId),
    redirect_uri: redirectUri,
    scope: 'openid profile phone',
    origin: pageOrigin,
    nonce: options.nonce,
    lang: options.lang,
  });

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
    `${TELEGRAM_OAUTH_ORIGIN}/auth?${params.toString()}`,
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
    const messageEvent =
      event.data && typeof event.data === 'object' && 'event' in event.data
        ? String((event.data as { event?: unknown }).event ?? '')
        : typeof event.data === 'string'
          ? 'string_payload'
          : 'unknown';

    if (!isTrustedTelegramMessageOrigin(event.origin, pageOrigin)) {
      logTelegramAuthEvent(
        'message_ignored_origin',
        debugContext(options, startedAt, {
          messageOrigin: event.origin,
          messageEvent,
        }),
      );
      return;
    }

    if (!isTrustedTelegramMessageSource(event, popup, pageOrigin)) {
      logTelegramAuthEvent(
        'message_ignored_source',
        debugContext(options, startedAt, {
          messageOrigin: event.origin,
          messageEvent,
        }),
      );
      return;
    }

    logTelegramAuthEvent(
      'message_received',
      debugContext(options, startedAt, {
        messageOrigin: event.origin,
        messageEvent,
        hasResult: event.data != null,
      }),
    );

    try {
      const result = parseTelegramAuthMessage(event.data);
      if (!result) {
        return;
      }
      if (result.error === 'missing id_token') {
        logTelegramAuthEvent(
          'missing_id_token',
          debugContext(options, startedAt, {
            messageOrigin: event.origin,
            messageEvent,
            hasResult: true,
            hasIdToken: false,
          }),
        );
        finish({ error: 'missing id_token' });
        return;
      }
      if (result.error) {
        logTelegramAuthEvent(
          'telegram_error',
          debugContext(options, startedAt, {
            messageOrigin: event.origin,
            messageEvent,
            telegramError: result.error,
          }),
        );
        finish(result);
        return;
      }
      logTelegramAuthEvent(
        'id_token_received',
        debugContext(options, startedAt, {
          messageOrigin: event.origin,
          messageEvent,
          hasIdToken: true,
        }),
      );
      finish(result);
    } catch {
      logTelegramAuthEvent(
        'message_parse_failed',
        debugContext(options, startedAt, {
          messageOrigin: event.origin,
          messageEvent,
        }),
      );
      finish({ error: 'malformed_response' });
    }
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
