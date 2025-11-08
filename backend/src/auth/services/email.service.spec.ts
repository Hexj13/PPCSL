import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import nodemailer from 'nodemailer';

import { EmailService } from './email.service';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let configService: jest.Mocked<ConfigService>;
  let jwtService: jest.Mocked<JwtService>;
  let mockTransporter: { sendMail: jest.Mock };

  beforeEach(async () => {
    mockTransporter = {
      sendMail: jest.fn(),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    const mockConfigService = {
      get: jest.fn(),
    };

    const mockJwtService = {
      sign: jest.fn(),
      verify: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get(ConfigService);
    jwtService = module.get(JwtService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should send email when SMTP is configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SMTP_HOST') return 'smtp.example.com';
        if (key === 'SMTP_PORT') return '587';
        if (key === 'SMTP_USER') return 'user@example.com';
        if (key === 'SMTP_PASSWORD') return 'password';
        if (key === 'SMTP_FROM') return 'noreply@kupito.mk';
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return undefined;
      });

      const serviceWithSmtp = new EmailService(configService, jwtService);
      jwtService.sign.mockReturnValue('test-token');
      mockTransporter.sendMail.mockResolvedValue({});

      await serviceWithSmtp.sendVerificationEmail('user-1', 'test@example.com');

      expect(jwtService.sign).toHaveBeenCalled();
      expect(mockTransporter.sendMail).toHaveBeenCalled();
    });

    it('should return silently when SMTP is not configured', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return undefined;
      });

      jwtService.sign.mockReturnValue('test-token');

      await service.sendVerificationEmail('user-1', 'test@example.com');

      expect(jwtService.sign).toHaveBeenCalled();
    });

    it('should throw BadRequestException when email send fails', async () => {
      configService.get.mockImplementation((key: string) => {
        if (key === 'SMTP_HOST') return 'smtp.example.com';
        if (key === 'SMTP_PORT') return '587';
        if (key === 'SMTP_USER') return 'user@example.com';
        if (key === 'SMTP_PASSWORD') return 'password';
        if (key === 'SMTP_FROM') return 'noreply@kupito.mk';
        if (key === 'FRONTEND_URL') return 'http://localhost:3000';
        return undefined;
      });

      const serviceWithSmtp = new EmailService(configService, jwtService);
      jwtService.sign.mockReturnValue('test-token');
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      await expect(
        serviceWithSmtp.sendVerificationEmail('user-1', 'test@example.com'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('verifyToken', () => {
    it('should return userId and email when token is valid', async () => {
      jwtService.verify.mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
        type: 'email_verification',
      });

      const result = await service.verifyToken('valid-token');

      expect(result).toEqual({
        userId: 'user-1',
        email: 'test@example.com',
      });
    });

    it('should return null when token type is invalid', async () => {
      jwtService.verify.mockReturnValue({
        userId: 'user-1',
        email: 'test@example.com',
        type: 'invalid_type',
      });

      const result = await service.verifyToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null when token is missing required fields', async () => {
      jwtService.verify.mockReturnValue({
        type: 'email_verification',
      });

      const result = await service.verifyToken('invalid-token');

      expect(result).toBeNull();
    });

    it('should return null when token verification fails', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await service.verifyToken('invalid-token');

      expect(result).toBeNull();
    });
  });
});
