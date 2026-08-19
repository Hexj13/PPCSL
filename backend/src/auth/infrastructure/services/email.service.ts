import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import nodemailer from 'nodemailer';

import {
  EmailLocale,
  interpolateEmailTemplate,
  localizedEmailPath,
  resolveEmailLocale,
} from '../../../common/email/email-locale';
import {
  buildEmailLayout,
  emailCtaButton,
  emailDigestListingCard,
  emailPlainParagraph,
  emailRawLink,
  emailTextParagraph,
  escapeHtml,
  normalizeSiteBaseUrl,
} from '../../../common/email/email-template';
import { I18nService } from '../../../common/i18n/i18n.service';
import { RedisService } from '../../../common/redis.service';

const EMAIL_CHANGE_ATTEMPTS_WINDOW_MS = 24 * 60 * 60 * 1000;
const EMAIL_CHANGE_ATTEMPTS_WINDOW_SECONDS = Math.floor(EMAIL_CHANGE_ATTEMPTS_WINDOW_MS / 1000);
const MAX_EMAIL_CHANGE_ATTEMPTS_PER_WINDOW = 2;
const DEFAULT_EMAIL_VERIFICATION_TTL_SECONDS = 72 * 3600;

const LOCAL_FRONTEND_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

function jwtExpiresInToSeconds(expiresIn: NonNullable<JwtSignOptions['expiresIn']>): number {
  if (typeof expiresIn === 'number' && Number.isFinite(expiresIn)) {
    return Math.max(1, Math.floor(expiresIn));
  }
  const raw = String(expiresIn).trim();
  if (raw.length === 0) {
    return DEFAULT_EMAIL_VERIFICATION_TTL_SECONDS;
  }
  if (/^\d+$/.test(raw)) {
    return Math.max(1, parseInt(raw, 10));
  }
  const match = /^(\d+)\s*([smhdw])$/i.exec(raw);
  if (match) {
    const n = parseInt(match[1], 10);
    const u = match[2].toLowerCase();
    const mult = u === 's' ? 1 : u === 'm' ? 60 : u === 'h' ? 3600 : u === 'd' ? 86400 : 7 * 86400;
    return Math.max(1, n * mult);
  }
  return DEFAULT_EMAIL_VERIFICATION_TTL_SECONDS;
}

type EmailVerificationTokenPayload = {
  userId: string;
  email: string;
  type: 'email_verification';
};

type EmailChangeTokenPayload = {
  userId: string;
  newEmail: string;
  type: 'email_change';
};

type VerifyTokenPayloadResult<T> =
  | { status: 'valid'; payload: T }
  | { status: 'expired'; payload: T }
  | { status: 'invalid' };

export type EmailVerificationTokenStatusResult =
  | { status: 'valid'; userId: string; email: string }
  | { status: 'expired'; userId: string; email: string }
  | { status: 'invalid' };

export type EmailChangeTokenStatusResult =
  | { status: 'valid'; userId: string; newEmail: string }
  | { status: 'expired'; userId: string; newEmail: string }
  | { status: 'invalid' };

export type ResendEmailTokenPayload =
  | { type: 'email_verification'; userId: string; email: string }
  | { type: 'email_change'; userId: string; newEmail: string };

type WeeklyViewsDigestItem = {
  title: string;
  views: number;
  status: string;
};

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private redisService: RedisService,
    private i18nService: I18nService,
  ) {
    const smtpHost = this.getEnvValue('SMTP_HOST');
    const smtpPort = this.getEnvValue('SMTP_PORT');
    const smtpUser = this.getEnvValue('SMTP_USER');
    const smtpPassword = this.getEnvValue('SMTP_PASSWORD');

    this.validateEmailConfiguration({
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
    });

    if (smtpHost && smtpPort && smtpUser && smtpPassword) {
      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(smtpPort),
        secure: parseInt(smtpPort) === 465,
        auth: {
          user: smtpUser,
          pass: smtpPassword,
        },
      });
    }
  }

  async sendVerificationEmail(
    userId: string,
    email: string,
    preferredLocale?: string | null,
  ): Promise<void> {
    const loc = this.resolveLocale(preferredLocale);
    const token = this.generateVerificationToken(userId, email);
    const siteBase = normalizeSiteBaseUrl(this.getFrontendUrl());
    const verificationUrl = this.frontendHref('/verify-email', loc, `token=${token}`);

    const emailSubject = this.emailT('emails.verification.subject', loc);
    const bodyHtml = [
      emailPlainParagraph(this.emailT('emails.verification.body', loc)),
      emailCtaButton(verificationUrl, this.emailT('emails.verification.cta', loc)),
      emailPlainParagraph(this.emailT('emails.verification.linkHelp', loc)),
      emailRawLink(verificationUrl),
      emailPlainParagraph(this.emailT('emails.verification.disclaimer', loc)),
    ].join('');

    const emailHtml = this.buildHtmlEmail(loc, siteBase, {
      subject: emailSubject,
      heading: this.emailT('emails.verification.heading', loc),
      preheader: this.emailT('emails.verification.preheader', loc),
      bodyHtml,
    });

    const emailText = this.emailT('emails.verification.textPlain', loc, { url: verificationUrl });

    await this.sendMail(email, emailSubject, emailText, emailHtml);
  }

  async sendEmailChangeConfirmationEmail(
    userId: string,
    newEmail: string,
    preferredLocale?: string | null,
  ): Promise<void> {
    const loc = this.resolveLocale(preferredLocale);
    const token = this.generateEmailChangeToken(userId, newEmail);
    const siteBase = normalizeSiteBaseUrl(this.getFrontendUrl());
    const confirmationUrl = this.frontendHref(
      '/profile/confirm-email-change',
      loc,
      `token=${token}`,
    );

    const emailSubject = this.emailT('emails.emailChange.subject', loc);
    const emailText = this.emailT('emails.emailChange.textPlain', loc, {
      url: confirmationUrl,
    });

    const bodyHtml = [
      emailPlainParagraph(this.emailT('emails.emailChange.body', loc)),
      emailCtaButton(confirmationUrl, this.emailT('emails.emailChange.cta', loc)),
      emailPlainParagraph(this.emailT('emails.emailChange.linkHelp', loc)),
      emailRawLink(confirmationUrl),
      emailPlainParagraph(this.emailT('emails.emailChange.disclaimer', loc)),
    ].join('');

    const emailHtml = this.buildHtmlEmail(loc, siteBase, {
      subject: emailSubject,
      heading: this.emailT('emails.emailChange.heading', loc),
      preheader: this.emailT('emails.emailChange.preheader', loc),
      bodyHtml,
    });

    await this.sendMail(newEmail, emailSubject, emailText, emailHtml);
  }

  async ensureEmailChangeAttemptAllowed(userId: string): Promise<void> {
    const attempts = await this.getRecentEmailChangeAttempts(userId);
    if (attempts.length >= MAX_EMAIL_CHANGE_ATTEMPTS_PER_WINDOW) {
      throw new BadRequestException('errors.emailChangeTooManyAttempts');
    }
  }

  async registerEmailChangeAttempt(userId: string): Promise<void> {
    const attempts = await this.getRecentEmailChangeAttempts(userId);
    const nextAttempts = [...attempts, Date.now()];
    await this.redisService.setJson(
      this.emailChangeAttemptsKey(userId),
      nextAttempts,
      EMAIL_CHANGE_ATTEMPTS_WINDOW_SECONDS,
    );
  }

  async ensureVerificationResendAttemptAllowed(
    tokenType: 'email_verification' | 'email_change',
    email: string,
  ): Promise<void> {
    const key = this.emailVerificationResendCooldownKey(tokenType, email);
    if (await this.redisService.exists(key)) {
      throw new BadRequestException('errors.emailVerificationResendOnCooldown');
    }
  }

  async registerVerificationResendCooldown(
    tokenType: 'email_verification' | 'email_change',
    email: string,
  ): Promise<void> {
    const ttlSeconds = this.getEmailVerificationTokenTtlSeconds();
    await this.redisService.setJson(
      this.emailVerificationResendCooldownKey(tokenType, email),
      true,
      ttlSeconds,
    );
  }

  async sendPasswordChangedNotification(
    email: string,
    preferredLocale?: string | null,
  ): Promise<void> {
    const loc = this.resolveLocale(preferredLocale);
    const subject = this.emailT('emails.passwordChanged.subject', loc);
    const siteBase = normalizeSiteBaseUrl(this.getFrontendUrl());
    const text = this.emailT('emails.passwordChanged.textPlain', loc);
    const bodyHtml = [
      emailPlainParagraph(this.emailT('emails.passwordChanged.body1', loc)),
      emailPlainParagraph(this.emailT('emails.passwordChanged.body2', loc)),
    ].join('');
    const html = this.buildHtmlEmail(loc, siteBase, {
      subject,
      heading: this.emailT('emails.passwordChanged.heading', loc),
      preheader: this.emailT('emails.passwordChanged.preheader', loc),
      bodyHtml,
    });
    await this.sendMail(email, subject, text, html);
  }

  async sendListingRefreshReminder(
    email: string,
    activeListingsCount: number,
    preferredLocale?: string | null,
  ): Promise<void> {
    const loc = this.resolveLocale(preferredLocale);
    const siteBase = normalizeSiteBaseUrl(this.getFrontendUrl());
    const myListingsUrl = this.frontendHref('/my-listings', loc);
    const subject = this.emailT('emails.listingRefresh.subject', loc);
    const text = this.emailT('emails.listingRefresh.textPlain', loc, {
      count: activeListingsCount,
      url: myListingsUrl,
    });
    const bodyHtmlTemplate = this.i18nService.translate('emails.listingRefresh.bodyHtml', loc);
    const bodyHowTo = this.i18nService.translate('emails.listingRefresh.bodyHowTo', loc);
    const bodyHtml = [
      emailTextParagraph(
        interpolateEmailTemplate(bodyHtmlTemplate, {
          siteName: escapeHtml(this.getSiteName() || 'platform'),
          domain: escapeHtml(this.getFrontendHostname() || 'localhost'),
          count: `<strong>${escapeHtml(String(activeListingsCount))}</strong>`,
        }),
      ),
      emailTextParagraph(bodyHowTo),
      emailCtaButton(myListingsUrl, this.emailT('emails.listingRefresh.cta', loc)),
    ].join('');
    const html = this.buildHtmlEmail(loc, siteBase, {
      subject,
      heading: this.emailT('emails.listingRefresh.heading', loc),
      preheader: this.emailT('emails.listingRefresh.preheader', loc),
      bodyHtml,
    });
    await this.sendMail(email, subject, text, html);
  }

  async sendWeeklyViewsDigest(
    email: string,
    items: WeeklyViewsDigestItem[],
    periodStart: Date,
    periodEnd: Date,
    preferredLocale?: string | null,
  ): Promise<void> {
    const loc = this.resolveLocale(preferredLocale);
    const siteBase = normalizeSiteBaseUrl(this.getFrontendUrl());
    const myListingsUrl = this.frontendHref('/my-listings', loc);
    const subject = this.emailT('emails.weeklyDigest.subject', loc);
    const period = `${periodStart.toISOString().slice(0, 10)} – ${periodEnd.toISOString().slice(0, 10)}`;
    const viewsWord = this.emailT('emails.weeklyDigest.viewsWord', loc);
    const textRowTemplate = this.i18nService.translate('emails.weeklyDigest.textRow', loc);
    const textRows = items
      .map((item, index) =>
        interpolateEmailTemplate(textRowTemplate, {
          index: index + 1,
          title: item.title,
          status: this.translateListingStatus(item.status, loc),
          count: item.views,
          viewsWord,
        }),
      )
      .join('\n');
    const text = `${this.emailT('emails.weeklyDigest.periodLine', loc, { period })}\n\n${this.emailT('emails.weeklyDigest.topListings', loc)}\n${textRows}\n\n${this.emailT('emails.weeklyDigest.textFooter', loc, { url: myListingsUrl })}`;
    const statusLabel = this.emailT('emails.weeklyDigest.statusLabel', loc);
    const viewsLabel = this.emailT('emails.weeklyDigest.viewsLabel', loc);
    const cards = items.map((item, index) =>
      emailDigestListingCard({
        index,
        title: item.title,
        status: this.translateListingStatus(item.status, loc),
        views: item.views,
        statusLabel,
        viewsLabel,
      }),
    );
    const periodLineHtml = escapeHtml(
      this.emailT('emails.weeklyDigest.periodLine', loc, { period }),
    );
    const bodyHtml = [
      emailTextParagraph(`<strong>${periodLineHtml}</strong>`),
      emailPlainParagraph(this.emailT('emails.weeklyDigest.topListings', loc)),
      ...cards,
      emailCtaButton(myListingsUrl, this.emailT('emails.weeklyDigest.cta', loc)),
    ].join('');
    const html = this.buildHtmlEmail(loc, siteBase, {
      subject,
      heading: this.emailT('emails.weeklyDigest.heading', loc),
      preheader: this.emailT('emails.weeklyDigest.preheader', loc, { period }),
      bodyHtml,
    });
    await this.sendMail(email, subject, text, html);
  }

  async sendPhoneChangedNotification(
    email: string,
    preferredLocale?: string | null,
  ): Promise<void> {
    const loc = this.resolveLocale(preferredLocale);
    const subject = this.emailT('emails.phoneChanged.subject', loc);
    const siteBase = normalizeSiteBaseUrl(this.getFrontendUrl());
    const text = this.emailT('emails.phoneChanged.textPlain', loc);
    const bodyHtml = [
      emailPlainParagraph(this.emailT('emails.phoneChanged.body1', loc)),
      emailPlainParagraph(this.emailT('emails.phoneChanged.body2', loc)),
    ].join('');
    const html = this.buildHtmlEmail(loc, siteBase, {
      subject,
      heading: this.emailT('emails.phoneChanged.heading', loc),
      preheader: this.emailT('emails.phoneChanged.preheader', loc),
      bodyHtml,
    });
    await this.sendMail(email, subject, text, html);
  }

  async sendEmailChangedNotification(
    email: string,
    preferredLocale?: string | null,
  ): Promise<void> {
    const loc = this.resolveLocale(preferredLocale);
    const subject = this.emailT('emails.emailChanged.subject', loc);
    const siteBase = normalizeSiteBaseUrl(this.getFrontendUrl());
    const text = this.emailT('emails.emailChanged.textPlain', loc);
    const bodyHtml = [
      emailPlainParagraph(this.emailT('emails.emailChanged.body1', loc)),
      emailPlainParagraph(this.emailT('emails.emailChanged.body2', loc)),
    ].join('');
    const html = this.buildHtmlEmail(loc, siteBase, {
      subject,
      heading: this.emailT('emails.emailChanged.heading', loc),
      preheader: this.emailT('emails.emailChanged.preheader', loc),
      bodyHtml,
    });
    await this.sendMail(email, subject, text, html);
  }

  private emailT(key: string, locale: EmailLocale, vars?: Record<string, string | number>): string {
    const raw = this.i18nService.translate(key, locale);
    return interpolateEmailTemplate(raw, {
      siteName: this.getSiteName() || 'platform',
      domain: this.getFrontendHostname() || 'localhost',
      ...vars,
    });
  }

  private resolveLocale(preferredLocale?: string | null): EmailLocale {
    return resolveEmailLocale(preferredLocale, {
      supportedLocales: this.getEnvValue('SUPPORTED_LOCALES'),
      defaultLocale: this.getEnvValue('DEFAULT_LOCALE'),
    });
  }

  private getRoutingDefaultLocale(): string {
    return this.getEnvValue('DEFAULT_LOCALE')?.toLowerCase() || 'en';
  }

  private frontendHref(restPath: string, locale: EmailLocale, query?: string): string {
    const base = normalizeSiteBaseUrl(this.getFrontendUrl());
    const withQuery = query ? `${restPath}?${query}` : restPath;
    return `${base}${localizedEmailPath(withQuery, locale, this.getRoutingDefaultLocale())}`;
  }

  private getSiteName(): string | undefined {
    return this.getEnvValue('SITE_NAME') || this.getEnvValue('PLATFORM_NAME');
  }

  private getEmailLogoSrc(): string | undefined {
    return this.getEnvValue('EMAIL_LOGO_PATH');
  }

  private buildHtmlEmail(
    loc: EmailLocale,
    siteBase: string,
    params: { subject: string; heading: string; preheader?: string; bodyHtml: string },
  ): string {
    const copyright = this.emailT('emails.footer.copyright', loc);
    const logoSrc = this.getEmailLogoSrc();
    return buildEmailLayout({
      siteBaseUrl: siteBase,
      documentTitle: params.subject,
      heading: params.heading,
      preheader: params.preheader,
      bodyHtml: params.bodyHtml,
      supportEmail: this.getSupportEmail(),
      signatureLine: this.emailT('emails.footer.tagline', loc),
      siteName: this.getSiteName(),
      copyrightLine: copyright === 'emails.footer.copyright' ? undefined : copyright,
      logoSrc,
      logoWidthPx: logoSrc ? 180 : 110,
    });
  }

  private translateListingStatus(status: string, locale: EmailLocale): string {
    const key = `emails.listingStatus.${status}`;
    const value = this.i18nService.translate(key, locale);
    return value === key ? status : value;
  }

  private getEmailVerificationTokenExpiresIn(): NonNullable<JwtSignOptions['expiresIn']> {
    const raw = this.configService.get<string>('EMAIL_VERIFICATION_TOKEN_EXPIRES_IN');
    const trimmed = typeof raw === 'string' ? raw.trim() : '';
    const value = trimmed.length > 0 ? trimmed : '72h';
    return value as NonNullable<JwtSignOptions['expiresIn']>;
  }

  private getEmailVerificationTokenTtlSeconds(): number {
    return jwtExpiresInToSeconds(this.getEmailVerificationTokenExpiresIn());
  }

  private generateVerificationToken(userId: string, email: string): string {
    const payload: EmailVerificationTokenPayload = { userId, email, type: 'email_verification' };
    return this.jwtService.sign(payload, { expiresIn: this.getEmailVerificationTokenExpiresIn() });
  }

  private generateEmailChangeToken(userId: string, newEmail: string): string {
    const payload: EmailChangeTokenPayload = {
      userId,
      newEmail,
      type: 'email_change',
    };
    return this.jwtService.sign(payload, { expiresIn: this.getEmailVerificationTokenExpiresIn() });
  }

  async verifyToken(token: string): Promise<EmailVerificationTokenStatusResult> {
    const result = this.verifyTokenPayload(token, this.parseEmailVerificationPayload);
    if (result.status === 'invalid') {
      return { status: 'invalid' };
    }
    return {
      status: result.status,
      userId: result.payload.userId,
      email: result.payload.email,
    };
  }

  async verifyEmailChangeToken(token: string): Promise<EmailChangeTokenStatusResult> {
    const result = this.verifyTokenPayload(token, this.parseEmailChangePayload);
    if (result.status === 'invalid') {
      return { status: 'invalid' };
    }
    return {
      status: result.status,
      userId: result.payload.userId,
      newEmail: result.payload.newEmail,
    };
  }

  async resolveTokenForResend(token: string): Promise<ResendEmailTokenPayload | null> {
    const emailVerificationToken = this.verifyTokenPayload(
      token,
      this.parseEmailVerificationPayload,
    );
    if (emailVerificationToken.status !== 'invalid') {
      return {
        type: 'email_verification',
        userId: emailVerificationToken.payload.userId,
        email: emailVerificationToken.payload.email,
      };
    }

    const emailChangeToken = this.verifyTokenPayload(token, this.parseEmailChangePayload);
    if (emailChangeToken.status !== 'invalid') {
      return {
        type: 'email_change',
        userId: emailChangeToken.payload.userId,
        newEmail: emailChangeToken.payload.newEmail,
      };
    }

    return null;
  }

  private getFrontendUrl(): string {
    return this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
  }

  private getFrontendHostname(): string | null {
    try {
      const host = new URL(this.getFrontendUrl()).hostname.toLowerCase();
      if (!host || LOCAL_FRONTEND_HOSTS.has(host)) {
        return null;
      }
      return host.replace(/^www\./, '');
    } catch {
      return null;
    }
  }

  private getSupportEmail(): string {
    const configured = this.getEnvValue('SUPPORT_EMAIL');
    if (configured) {
      return configured;
    }
    const host = this.getFrontendHostname();
    return host ? `support@${host}` : 'support@localhost';
  }

  private getSmtpFrom(): string {
    const configured = this.getEnvValue('SMTP_FROM');
    if (configured) {
      return configured;
    }
    const host = this.getFrontendHostname();
    return host ? `noreply@${host}` : 'noreply@localhost';
  }

  private emailChangeAttemptsKey(userId: string): string {
    return `email:change:attempts:${userId}`;
  }

  private emailVerificationResendCooldownKey(
    tokenType: 'email_verification' | 'email_change',
    email: string,
  ): string {
    const normalizedEmail = email.trim().toLowerCase();
    return `email:${tokenType}:resend:cooldown:${encodeURIComponent(normalizedEmail)}`;
  }

  private async getRecentEmailChangeAttempts(userId: string): Promise<number[]> {
    const rawAttempts = await this.redisService.getJson<number[]>(
      this.emailChangeAttemptsKey(userId),
    );
    if (!Array.isArray(rawAttempts)) {
      return [];
    }
    const minTimestamp = Date.now() - EMAIL_CHANGE_ATTEMPTS_WINDOW_MS;
    return rawAttempts.filter(
      (value): value is number =>
        typeof value === 'number' && Number.isFinite(value) && value > minTimestamp,
    );
  }

  private verifyTokenPayload<T>(
    token: string,
    parsePayload: (payload: unknown) => T | null,
  ): VerifyTokenPayloadResult<T> {
    try {
      const payload = this.jwtService.verify(token) as unknown;
      const parsedPayload = parsePayload(payload);
      if (!parsedPayload) {
        return { status: 'invalid' };
      }
      return { status: 'valid', payload: parsedPayload };
    } catch (error) {
      if (!(error instanceof TokenExpiredError)) {
        return { status: 'invalid' };
      }

      try {
        const payload = this.jwtService.verify(token, { ignoreExpiration: true }) as unknown;
        const parsedPayload = parsePayload(payload);
        if (!parsedPayload) {
          return { status: 'invalid' };
        }
        return { status: 'expired', payload: parsedPayload };
      } catch {
        return { status: 'invalid' };
      }
    }
  }

  private parseEmailVerificationPayload(
    payload: unknown,
  ): { userId: string; email: string } | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const value = payload as {
      userId?: unknown;
      email?: unknown;
      type?: unknown;
    };
    if (
      value.type !== 'email_verification' ||
      typeof value.userId !== 'string' ||
      value.userId.length === 0 ||
      typeof value.email !== 'string' ||
      value.email.length === 0
    ) {
      return null;
    }
    return {
      userId: value.userId,
      email: value.email,
    };
  }

  private parseEmailChangePayload(payload: unknown): { userId: string; newEmail: string } | null {
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const value = payload as {
      userId?: unknown;
      newEmail?: unknown;
      type?: unknown;
    };
    if (
      value.type !== 'email_change' ||
      typeof value.userId !== 'string' ||
      value.userId.length === 0 ||
      typeof value.newEmail !== 'string' ||
      value.newEmail.length === 0
    ) {
      return null;
    }
    return {
      userId: value.userId,
      newEmail: value.newEmail,
    };
  }

  private async sendMail(to: string, subject: string, text: string, html: string): Promise<void> {
    if (!this.transporter) {
      return;
    }

    try {
      const smtpFrom = this.getSmtpFrom();
      await this.transporter.sendMail({
        from: smtpFrom,
        replyTo: this.getSupportEmail(),
        to,
        subject,
        text,
        html,
      });
    } catch (error: unknown) {
      void error;
      throw new BadRequestException('errors.emailServiceUnavailable');
    }
  }

  private getEnvValue(name: string): string | undefined {
    const value = this.configService.get<string>(name);
    if (typeof value !== 'string') {
      return undefined;
    }
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  private validateEmailConfiguration(config: {
    smtpHost?: string;
    smtpPort?: string;
    smtpUser?: string;
    smtpPassword?: string;
  }): void {
    const nodeEnv = this.configService.get<string>('NODE_ENV')?.toLowerCase() ?? '';
    const smtpValues = [config.smtpHost, config.smtpPort, config.smtpUser, config.smtpPassword];
    const hasAnySmtp = smtpValues.some((value) => Boolean(value));
    const hasAllSmtp = smtpValues.every((value) => Boolean(value));

    if (hasAnySmtp && !hasAllSmtp) {
      throw new Error(
        'SMTP_HOST, SMTP_PORT, SMTP_USER and SMTP_PASSWORD must be set together to enable email sending',
      );
    }

    if (!hasAllSmtp) {
      if (nodeEnv === 'production') {
        this.validateFrontendUrlForProduction();
      }
      return;
    }

    const parsedPort = parseInt(config.smtpPort as string);
    if (!Number.isFinite(parsedPort) || parsedPort <= 0) {
      throw new Error('SMTP_PORT must be a valid positive integer');
    }

    if (nodeEnv === 'production') {
      this.validateFrontendUrlForProduction();
    }
  }

  private validateFrontendUrlForProduction(): void {
    const frontendUrl = this.getEnvValue('FRONTEND_URL');
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL must be set in production for email links');
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(frontendUrl);
    } catch {
      throw new Error('FRONTEND_URL must be a valid absolute URL in production');
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      throw new Error('FRONTEND_URL must use http or https in production');
    }

    const hostname = parsedUrl.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname === '::1'
    ) {
      throw new Error('FRONTEND_URL must not point to localhost in production');
    }

    if (parsedUrl.pathname && parsedUrl.pathname !== '/') {
      throw new Error('FRONTEND_URL must not include a path in production');
    }
  }
}
