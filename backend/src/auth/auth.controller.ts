import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { UsersService } from '../users/users.service';

import { AuthService } from './auth.service';
import { ChangePhoneRequestDto, ChangePhoneVerifyDto } from './dto/change-phone.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { VerifySmsDto } from './dto/verify-sms.dto';
import { IpBlockGuard } from './guards/ip-block.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IpBlockService } from './services/ip-block.service';
import { SmsService } from './services/sms.service';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private ipBlockService: IpBlockService,
    private smsService: SmsService,
    private usersService: UsersService,
  ) {}

  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: 201,
    description: 'User successfully registered',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', nullable: true },
            phone: { type: 'string', nullable: true },
            firstName: { type: 'string', nullable: true },
            lastName: { type: 'string', nullable: true },
            type: { type: 'string', enum: ['Individual', 'Business'] },
            active: { type: 'boolean' },
            emailVerified: { type: 'boolean', nullable: true },
            phoneVerified: { type: 'boolean' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({
    status: 200,
    description: 'Successful login',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', nullable: true },
                type: { type: 'string' },
                firstName: { type: 'string', nullable: true },
                lastName: { type: 'string', nullable: true },
                companyName: { type: 'string', nullable: true },
                phone: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(200)
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'User profile',
    content: {
      'application/json': {
        schema: {
          type: 'object',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const user = await this.authService.getUserProfile(req.user.id);
    return user;
  }

  @ApiOperation({ summary: 'Update user profile' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid data',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const user = await this.authService.updateProfile(req.user.id, updateProfileDto);
    return user;
  }

  @ApiOperation({
    summary: 'Delete user account',
    description:
      'Permanently deletes the authenticated user account. All personal data (email, phone, firstName, lastName, companyName) will be nullified, and all active/paused listings will be closed. The account will be marked as inactive. This action is irreversible.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Account deleted successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            message: {
              type: 'string',
              example: 'Аккаунтот е успешно избришан',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Account is already deleted or inactive',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string', example: 'Аккаунтот е веќе избришан или деактивиран' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @UseGuards(JwtAuthGuard)
  @Delete('profile')
  async deleteAccount(@Request() req) {
    return this.authService.deleteAccount(req.user.id);
  }

  @ApiOperation({ summary: 'Request phone number change' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'SMS code sent successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid phone number or phone already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @UseGuards(JwtAuthGuard)
  @Post('change-phone-request')
  async requestPhoneChange(@Request() req, @Body() changePhoneRequestDto: ChangePhoneRequestDto) {
    await this.authService.requestPhoneChange(req.user.id, changePhoneRequestDto);
    return { success: true, message: 'SMS кодот е испратен' };
  }

  @ApiOperation({ summary: 'Verify phone number change' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Phone number changed successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid code or phone already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @UseGuards(JwtAuthGuard)
  @Post('change-phone-verify')
  async verifyPhoneChange(@Request() req, @Body() changePhoneVerifyDto: ChangePhoneVerifyDto) {
    const user = await this.authService.verifyPhoneChange(req.user.id, changePhoneVerifyDto);
    return user;
  }

  @ApiOperation({ summary: 'Verify phone number' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Phone number verified',
    content: {
      'application/json': {
        schema: {
          type: 'object',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 401 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @UseGuards(JwtAuthGuard)
  @Post('verify-phone')
  async verifyPhone(@Request() req) {
    const user = await this.authService.verifyPhone(req.user.id);
    return user;
  }

  @ApiOperation({ summary: 'Check if phone number is available' })
  @ApiResponse({
    status: 200,
    description: 'Phone number availability status',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            available: { type: 'boolean' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Phone number already exists',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('check-phone')
  async checkPhone(@Body() sendSmsDto: SendSmsDto) {
    const normalizedPhone = this.smsService.normalizePhoneNumber(sendSmsDto.phone);
    const existingUser = await this.usersService.findByPhone(normalizedPhone);

    if (existingUser) {
      throw new BadRequestException('Корисник со овој телефон веќе постои');
    }

    return { available: true };
  }

  @ApiOperation({ summary: 'Send SMS verification code' })
  @ApiResponse({
    status: 200,
    description: 'SMS code sent successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Phone number already exists',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('send-sms')
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    const normalizedPhone = this.smsService.normalizePhoneNumber(sendSmsDto.phone);
    const existingUser = await this.usersService.findByPhone(normalizedPhone);

    if (existingUser) {
      throw new BadRequestException('Корисник со овој телефон веќе постои');
    }

    await this.smsService.sendVerificationCode(sendSmsDto.phone);
    return { success: true, message: 'SMS кодот е испратен' };
  }

  @ApiOperation({ summary: 'Verify SMS code' })
  @ApiResponse({
    status: 200,
    description: 'Code verified successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid code',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @UseGuards(IpBlockGuard)
  @Post('verify-sms')
  async verifySms(@Request() req, @Body() verifySmsDto: VerifySmsDto) {
    const ip = this.ipBlockService.getClientIp(req);

    if (!verifySmsDto.phone) {
      throw new BadRequestException('Телефонскиот број е задолжителен');
    }

    const isVerified = await this.smsService.verifyCode(verifySmsDto.phone, verifySmsDto.code);

    if (isVerified) {
      this.ipBlockService.resetAttempts(ip);
      return { success: true, message: 'Кодот е успешно верифициран' };
    }

    this.ipBlockService.recordFailedAttempt(ip);
    throw new BadRequestException('Невалиден код. Обидете се повторно.');
  }

  @ApiOperation({ summary: 'Verify email address' })
  @ApiResponse({
    status: 200,
    description: 'Email address verified successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            user: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const user = await this.authService.verifyEmail(verifyEmailDto.token);
    return {
      success: true,
      message: 'Email адресата е успешно потврдена',
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        phone: user.phone,
        emailVerified: user.emailVerified,
      },
    };
  }

  @ApiOperation({ summary: 'Request password reset' })
  @ApiResponse({
    status: 200,
    description: 'Password reset code sent successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'User not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @HttpCode(200)
  @Post('request-password-reset')
  async requestPasswordReset(@Body() requestPasswordResetDto: RequestPasswordResetDto) {
    await this.authService.requestPasswordReset(requestPasswordResetDto);
    return { success: true, message: 'SMS кодот за ресетирање на лозинка е испратен' };
  }

  @ApiOperation({ summary: 'Verify password reset code' })
  @ApiResponse({
    status: 200,
    description: 'Code verified successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid code',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @UseGuards(IpBlockGuard)
  @Post('verify-reset-code')
  async verifyResetCode(@Request() req, @Body() verifyResetCodeDto: VerifyResetCodeDto) {
    const ip = this.ipBlockService.getClientIp(req);

    if (!verifyResetCodeDto.phone) {
      throw new BadRequestException('Телефонскиот број е задолжителен');
    }

    const result = await this.authService.verifyResetCode(verifyResetCodeDto);

    if (result.success) {
      this.ipBlockService.resetAttempts(ip);
      return { success: true, message: 'Кодот е успешно верифициран' };
    }

    this.ipBlockService.recordFailedAttempt(ip);
    throw new BadRequestException('Невалиден код. Обидете се повторно.');
  }

  @ApiOperation({ summary: 'Reset password' })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            message: { type: 'string' },
            user: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid code or user not found',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            statusCode: { type: 'number', example: 400 },
            message: { type: 'string' },
            timestamp: { type: 'string' },
            path: { type: 'string' },
          },
        },
      },
    },
  })
  @UseGuards(IpBlockGuard)
  @Post('reset-password')
  async resetPassword(@Request() req, @Body() resetPasswordDto: ResetPasswordDto) {
    const ip = this.ipBlockService.getClientIp(req);

    if (!resetPasswordDto.phone) {
      throw new BadRequestException('Телефонскиот број е задолжителен');
    }

    if (!resetPasswordDto.code) {
      throw new BadRequestException('Кодот е задолжителен');
    }

    if (!resetPasswordDto.newPassword) {
      throw new BadRequestException('Новата лозинка е задолжителна');
    }

    try {
      const user = await this.authService.resetPassword(resetPasswordDto);
      this.ipBlockService.resetAttempts(ip);
      return {
        success: true,
        message: 'Лозинката е успешно ресетирана',
        user: {
          id: user.id,
          email: user.email,
          type: user.type,
          firstName: user.firstName,
          lastName: user.lastName,
          companyName: user.companyName,
          phone: user.phone,
        },
      };
    } catch (error) {
      this.ipBlockService.recordFailedAttempt(ip);
      throw error;
    }
  }
}
