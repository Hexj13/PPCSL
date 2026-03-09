# Telegram Support Bot (Bug Reports)

The backend exposes a webhook for a Telegram bot that accepts bug reports from users and forwards them to a private support chat.

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Yes | Bot token from [@BotFather](https://t.me/BotFather) (`/newbot`) |
| `TELEGRAM_SUPPORT_CHAT_ID` | Yes | ID of the group or channel where reports are sent (e.g. `-1001234567890`) |
| `APP_BASE_URL` or `BACKEND_URL` | For webhook setup | Public base URL of the API (e.g. `https://api.kupito.club`) |
| `DEFAULT_LOCALE` | No | Default locale for bot replies when user language is not supported (`ro`, `ru`, `en`) |

If `TELEGRAM_BOT_TOKEN` or `TELEGRAM_SUPPORT_CHAT_ID` are not set, the bot logic is skipped and the webhook still returns 200 (no crash).

## Webhook registration

After deployment, register the webhook with Telegram once:

```bash
# Replace <TOKEN> and <APP_BASE_URL>
curl "https://api.telegram.org/bot<TOKEN>/setWebhook?url=<APP_BASE_URL>/api/telegram/webhook"
```

Example:

```bash
curl "https://api.telegram.org/bot123456:ABC-DEF/setWebhook?url=https://api.kupito.club/api/telegram/webhook"
```

To remove the webhook:

```bash
curl "https://api.telegram.org/bot<TOKEN>/deleteWebhook"
```

## User flow

1. User opens the bot (e.g. `https://t.me/YourBotUsername`) and taps **Start**.
2. Bot replies with a welcome message (from `telegram.welcome` backend locale).
3. User sends a text message (or photo with optional caption) describing the bug.
4. Backend forwards the message to the support chat with sender metadata (name, username, Telegram ID, timestamp).
5. Bot sends a confirmation to the user (`telegram.confirmation`).

## API

- **POST** `/api/telegram/webhook` — receives Telegram Update payloads. No auth; throttling is disabled for this route. Always returns 200.

## Support chat message format

```
New bug report

From:
Name: <first_name last_name or ->
Username: @username or -
Telegram ID: <id>

Message:
<user text>

Received at:
<ISO timestamp>
```

## Localization

Bot replies to the user are sent as **one message** with text in two languages: first Romanian (ro), then a separator `—`, then Russian (ru). Example: `[RO text]\n\n—\n\n[RU text]`. Keys are under the `telegram` section in backend locales (`locales/backend/ro.json`, `locales/backend/ru.json`).
