---
title: SMTP email setup (local and production)
owner: platform
tags:
  - type/runbook
  - domain/ops
  - scope/core
  - status/active
---

# SMTP email setup (local and production)

**Русский:** [smtp-email-setup-ru.md](./smtp-email-setup-ru.md)

How to enable **transactional email** (verification, email change, security notifications) for the NestJS backend. Sending is implemented with Nodemailer in `core/backend/src/auth/infrastructure/services/email.service.ts`.

## Behavior

- Security and non-verification transactional mail (e.g. password or phone changed) is sent only when the user’s email is **verified** (`emailVerified`). Verification and email-change confirmation messages are the exception: they are sent to the pending address on purpose.
- If **all** of `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, and `SMTP_PASSWORD` are set, the app creates an SMTP transporter and sends mail.
- If any of those are missing, **no transporter is created**; `sendMail` is a no-op. API requests do not fail solely because SMTP is unset.
- Link targets in messages use **`FRONTEND_URL`**. If unset, the backend falls back to `http://localhost:3000`.
- **`SMTP_FROM`** is optional. Default in code: `noreply@kupito.club`. Your provider may require `From` to match an allowed sender or domain.
- `replyTo` is set from `SUPPORT_EMAIL` (or `support@kupito.club` by default).
- In `NODE_ENV=production`, backend validates email config on startup:
  - `FRONTEND_URL` is required and must be an absolute `http(s)` URL
  - `FRONTEND_URL` must not point to localhost and must not include a path
  - partial SMTP setup is rejected (`SMTP_*` must be either fully set or fully unset)

| Variable        | Required | Purpose |
|-----------------|----------|---------|
| `SMTP_HOST`     | Yes*     | SMTP server hostname |
| `SMTP_PORT`     | Yes*     | Port (see below) |
| `SMTP_USER`     | Yes*     | SMTP username (often full email) |
| `SMTP_PASSWORD` | Yes*     | Password or app password |
| `SMTP_FROM`     | No       | `From` header (e.g. `Kupito <noreply@yourdomain.com>`) |
| `SUPPORT_EMAIL` | No       | `Reply-To` and support contact in email footer |
| `FRONTEND_URL`  | No       | Base URL for links in emails |
| `EMAIL_VERIFICATION_TOKEN_EXPIRES_IN` | No | JWT lifetime for registration verification and email-change links (string accepted by `jsonwebtoken`, e.g. `72h`). Default: `72h`. For local UI testing of expired links, use e.g. `5s` (restart API after changing). |

\*Required only if you want email to actually send.

**Port and TLS:** The backend sets `secure: true` only when `SMTP_PORT` is **465**. For **587**, Nodemailer typically uses STARTTLS. Use the port your provider documents.

---

## Local development

1. Open the backend env file (platform repo with submodule: `core/backend/.env`; standalone PPCSL clone: `backend/.env`).
2. Set `FRONTEND_URL` to your local frontend (usually `http://localhost:3000`).
3. Add the SMTP variables (see Google Workspace below or use a test inbox).

**Testing without real delivery:** Use a capture SMTP provider (e.g. Mailtrap) and paste its host, port, user, and password into the four `SMTP_*` variables.

**Preview all transactional templates (dev/stage/test only):** From `core/backend`, with Mailtrap (or any SMTP) configured:

```bash
SEND_TEST_EMAIL_TO="<address shown in Mailtrap inbox>" npm run send-test-emails
```

Optional: `SEND_TEST_EMAIL_LOCALE=en|ro|ru` (defaults to `en` when unset). All sample bodies use backend `locales/backend/*.json` under `emails.*`.

This sends seven sample messages (verification, email change, password/phone/email notifications, listing refresh reminder, weekly views digest). The script refuses `NODE_ENV=production`. It spaces out sends and retries transient SMTP failures a few times with backoff (helps with Mailtrap rate limits).

**Without SMTP:** The app runs; flows that trigger email simply do not deliver messages.

---

## Production (Render.com)

1. In the Render Dashboard, open your **backend** web service (the service that runs the Nest API).
2. Go to **Environment** and add the same variables as in the table. Mark secrets (`SMTP_PASSWORD`, etc.) as **Secret** in Render if the UI offers it.
3. Set `FRONTEND_URL` to your **public** site URL (e.g. `https://your-domain.com`). This must match what users open in the browser so links in emails work.
4. **Redeploy** (or restart) the service so new env vars load.

Render outbound IPs are often **dynamic** unless you use a feature that provides static egress. If you rely on Google **SMTP relay with IP allowlisting only**, that combination is fragile; prefer authenticated SMTP with a Workspace account (below).

---

## Google Workspace (corporate Gmail)

Recommended approach for Render and local: a **dedicated mailbox** in your domain (e.g. `noreply@yourcompany.com`) and **SMTP submission** to Google’s hosted servers.

### Steps (typical)

1. Create or choose a Workspace user used only for sending (e.g. `noreply@...`).
2. Enable **2-Step Verification** for that user (required for app passwords in consumer-style flows; Workspace may use **App passwords** under Admin policy).
3. In the Google Account for that user, create an **App password** (Security → App passwords) and use it as `SMTP_PASSWORD`. If App passwords are disabled org-wide, a Workspace admin must allow them or you must use another supported authentication method your admin provides.
4. Configure the backend:

   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=noreply@yourcompany.com
   SMTP_PASSWORD=<16-char-app-password>
   SMTP_FROM=Kupito <noreply@yourcompany.com>
   FRONTEND_URL=https://your-production-domain.com
   ```

5. Ensure **`SMTP_FROM`** is acceptable to Google (usually the same address as `SMTP_USER` or an alias configured for that user in Gmail/Admin).

### SMTP relay (`smtp-relay.gmail.com`)

Some organizations use [Google’s SMTP relay service](https://support.google.com/a/answer/2956491) instead of `smtp.gmail.com`. Settings depend on Admin console rules (IP ranges, authentication, TLS). If relay is **IP-only** and Render IPs are not fixed, delivery may fail or be inconsistent. Coordinate with your Google Workspace admin.

### Deliverability

For production, your domain’s **SPF** and **DKIM** (and DMARC, if used) should align with how you send mail. Workspace admins configure this in Google Admin / DNS. Poor DNS setup can send messages to spam regardless of correct SMTP credentials.

---

## Troubleshooting

| Symptom | Things to check |
|---------|------------------|
| No emails, no API error | SMTP vars incomplete → transporter not created. |
| API returns 400 with SMTP error | Credentials, host/port, or provider blocking (check Render logs). |
| Links open wrong host | Set `FRONTEND_URL` to the real public frontend URL. |
| Google “invalid credentials” | App password vs normal password; 2SV; org policy blocking SMTP or app passwords. |

---

## Related documentation

- Environment overview: [../architecture/TECHNICAL.md](../architecture/TECHNICAL.md) (SMTP block in backend env section).
- VPS-style deploy example: [../guides/DEPLOYMENT.md](../guides/DEPLOYMENT.md).
- Moldova platform Render checklist: `docs/deployment/production-deployment.md` (platform repo).
