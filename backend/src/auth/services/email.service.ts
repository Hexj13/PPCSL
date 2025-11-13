import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
  ) {
    const smtpHost = this.configService.get('SMTP_HOST');
    const smtpPort = this.configService.get('SMTP_PORT');
    const smtpUser = this.configService.get('SMTP_USER');
    const smtpPassword = this.configService.get('SMTP_PASSWORD');

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

  async sendVerificationEmail(userId: string, email: string): Promise<void> {
    const token = this.generateVerificationToken(userId, email);
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    const verificationUrl = `${frontendUrl}/verify-email?token=${token}`;

    const emailSubject = 'Потврда на email адреса - Kupito';
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
          <h1 style="color: white; margin: 0;">Kupito</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
          <h2 style="color: #333; margin-top: 0;">Потврда на email адреса</h2>
          <p style="color: #666;">Ви благодариме за регистрацијата на Kupito. За да го потврдите вашиот email, кликнете на копчето подолу:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationUrl}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Confirm</a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">Ако не сте вие што ја направивте оваа регистрација, можете да го игнорирате овој email.</p>
        </div>
      </body>
      </html>
    `;

    const emailText = `Потврда на email адреса\n\nВи благодариме за регистрацијата на Kupito. За да го потврдите вашиот email, отворете ја следната врска:\n\n${verificationUrl}\n\nАко не сте вие што ја направивте оваа регистрација, можете да го игнорирате овој email.`;

    if (!this.transporter) {
      return;
    }

    try {
      const smtpFrom = this.configService.get('SMTP_FROM') || 'noreply@kupito.club';
      await this.transporter.sendMail({
        from: smtpFrom,
        to: email,
        subject: emailSubject,
        text: emailText,
        html: emailHtml,
      });
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Грешка при испраќање на email. Обидете се повторно.';
      throw new BadRequestException(errorMessage);
    }
  }

  private generateVerificationToken(userId: string, email: string): string {
    const payload = { userId, email, type: 'email_verification' };
    return this.jwtService.sign(payload, { expiresIn: '24h' });
  }

  async verifyToken(token: string): Promise<{ userId: string; email: string } | null> {
    try {
      const payload = this.jwtService.verify(token) as {
        userId?: string;
        email?: string;
        type?: string;
      };

      if (payload.type !== 'email_verification' || !payload.userId || !payload.email) {
        return null;
      }

      return {
        userId: payload.userId,
        email: payload.email,
      };
    } catch {
      return null;
    }
  }
}
