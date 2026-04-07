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

import type { AuthenticatedRequest } from '../../common/express-augmentation';
import { I18nService } from '../../common/i18n/i18n.service';
import { UsersService } from '../../users/application/users.service';
import { AuthService } from '../application/auth.service';
import { IpBlockGuard } from '../infrastructure/guards/ip-block.guard';
import { JwtAuthGuard } from '../infrastructure/guards/jwt-auth.guard';
import { IpBlockService } from '../infrastructure/services/ip-block.service';
import { SmsService } from '../infrastructure/services/sms.service';

const isProduction = process.env.NODE_ENV === 'production';
const getThrottleLimit = (prodLimit: number, devLimit: number = prodLimit * 100) => ({
  default: { limit: isProduction ? prodLimit : devLimit, ttl: 60000 },
});

const getSmsIpThrottle = (prodLimit: number, devLimit: number = prodLimit * 50) => ({
  default: { limit: isProduction ? prodLimit : devLimit, ttl: 3_600_000 },
});

import { ChangeEmailConfirmDto, ChangeEmailRequestDto } from './dto/change-email.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ChangePhoneRequestDto, ChangePhoneVerifyDto } from './dto/change-phone.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { RequestPasswordResetDto } from './dto/request-password-reset.dto';
import { ResendEmailVerificationDto } from './dto/resend-email-verification.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { VerifySmsDto } from './dto/verify-sms.dto';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private ipBlockService: IpBlockService,
    private smsService: SmsService,
    private usersService: UsersService,
    private i18nService: I18nService,
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
            emailVerificationSent: { type: 'boolean' },
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
  @Throttle(getThrottleLimit(3, 100))
  @Post('register')
  async register(@Request() req: AuthenticatedRequest, @Body() registerDto: RegisterDto) {
    const ip = this.ipBlockService.getClientIp(req);
    return this.authService.register(registerDto, ip, this.getRequestLocale(req));
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
            refresh_token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', nullable: true },
                type: { type: 'string' },
                firstName: { type: 'string', nullable: true },
                lastName: { type: 'string', nullable: true },
                companyName: { type: 'string', nullable: true },
                companyWebsiteUrl: { type: 'string', nullable: true },
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
  @Throttle(getThrottleLimit(5, 200))
  @UseGuards(IpBlockGuard)
  @HttpCode(200)
  @Post('login')
  async login(@Request() req: AuthenticatedRequest, @Body() loginDto: LoginDto) {
    const ip = this.ipBlockService.getClientIp(req);
    try {
      const result = await this.authService.login(loginDto, ip);
      this.ipBlockService.resetAttempts(ip);
      return result;
    } catch (error) {
      this.ipBlockService.recordFailedAttempt(ip);
      throw error;
    }
  }

  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            access_token: { type: 'string' },
            refresh_token: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', nullable: true },
                type: { type: 'string' },
                firstName: { type: 'string', nullable: true },
                lastName: { type: 'string', nullable: true },
                companyName: { type: 'string', nullable: true },
                companyWebsiteUrl: { type: 'string', nullable: true },
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
    description: 'Invalid or expired refresh token',
  })
  @Throttle(getThrottleLimit(10, 500))
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshTokens(refreshTokenDto);
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
  async getProfile(@Request() req: AuthenticatedRequest) {
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
  async updateProfile(
    @Request() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    const user = await this.authService.updateProfile(
      req.user.id,
      updateProfileDto,
      this.getRequestLocale(req),
    );
    return user;
  }

  @ApiOperation({ summary: 'Request email change confirmation link' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Email change confirmation sent',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid email or email already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @UseGuards(JwtAuthGuard)
  @Post('change-email-request')
  async requestEmailChange(
    @Request() req: AuthenticatedRequest,
    @Body() changeEmailRequestDto: ChangeEmailRequestDto,
  ) {
    await this.authService.requestEmailChange(
      req.user.id,
      changeEmailRequestDto,
      this.getRequestLocale(req),
    );
    return { success: true };
  }

  @ApiOperation({ summary: 'Confirm email change by token' })
  @ApiResponse({
    status: 200,
    description: 'Email changed successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            user: { type: 'object' },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired token',
  })
  @Throttle(getThrottleLimit(5, 200))
  @Post('change-email-confirm')
  async confirmEmailChange(@Body() changeEmailConfirmDto: ChangeEmailConfirmDto) {
    const user = await this.authService.confirmEmailChange(changeEmailConfirmDto);
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        companyWebsiteUrl: user.companyWebsiteUrl,
        phone: user.phone,
        emailVerified: user.emailVerified,
      },
    };
  }

  @ApiOperation({ summary: 'Change password (authenticated)' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Password changed successfully',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid current password or validation error' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Throttle(getThrottleLimit(5, 200))
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Request() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(
      req.user.id,
      changePasswordDto,
      this.getRequestLocale(req),
    );
    return { success: true };
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
            success: { type: 'boolean', example: true },
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
            message: { type: 'string', example: 'This account has been deactivated.' },
            errorKey: { type: 'string', example: 'errors.userDeactivated' },
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
  async deleteAccount(@Request() req: AuthenticatedRequest) {
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
  async requestPhoneChange(
    @Request() req: AuthenticatedRequest,
    @Body() changePhoneRequestDto: ChangePhoneRequestDto,
  ) {
    await this.authService.requestPhoneChange(req.user.id, changePhoneRequestDto);
    return { success: true };
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
  async verifyPhoneChange(
    @Request() req: AuthenticatedRequest,
    @Body() changePhoneVerifyDto: ChangePhoneVerifyDto,
  ) {
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
  async verifyPhone(@Request() req: AuthenticatedRequest) {
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
  @Throttle(getThrottleLimit(10, 500))
  @Post('check-phone')
  async checkPhone(@Body() sendSmsDto: SendSmsDto) {
    return this.authService.checkPhoneAvailability(sendSmsDto.phone);
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
  @Throttle(getSmsIpThrottle(30, 500))
  @Post('send-sms')
  async sendSms(@Body() sendSmsDto: SendSmsDto) {
    return this.authService.sendVerificationSms(sendSmsDto.phone);
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
  async verifySms(@Request() req: AuthenticatedRequest, @Body() verifySmsDto: VerifySmsDto) {
    const ip = this.ipBlockService.getClientIp(req);

    const isVerified = await this.smsService.verifyCode(verifySmsDto.phone, verifySmsDto.code);

    if (isVerified) {
      this.ipBlockService.resetAttempts(ip);
      return { success: true };
    }

    this.ipBlockService.recordFailedAttempt(ip);
    throw new BadRequestException('errors.invalidCode');
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
  @Throttle(getThrottleLimit(5, 200))
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    const user = await this.authService.verifyEmail(verifyEmailDto.token);
    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        type: user.type,
        firstName: user.firstName,
        lastName: user.lastName,
        companyName: user.companyName,
        companyWebsiteUrl: user.companyWebsiteUrl,
        phone: user.phone,
        emailVerified: user.emailVerified,
      },
    };
  }

  @ApiOperation({ summary: 'Resend email verification link by token' })
  @ApiResponse({
    status: 200,
    description: 'Verification email sent',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid token or rate limit exceeded',
  })
  @Throttle(getThrottleLimit(3, 100))
  @Post('resend-email-verification')
  async resendEmailVerification(
    @Request() req: AuthenticatedRequest,
    @Body() resendEmailVerificationDto: ResendEmailVerificationDto,
  ) {
    await this.authService.resendEmailVerification(
      resendEmailVerificationDto.token,
      this.getRequestLocale(req),
    );
    return { success: true };
  }

  private getRequestLocale(req: { headers?: AuthenticatedRequest['headers'] }): string {
    const acceptLanguage = req.headers?.['accept-language'];
    return this.i18nService.getLocaleFromHeader(
      Array.isArray(acceptLanguage) ? acceptLanguage.join(',') : acceptLanguage,
    );
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
  @Throttle(getSmsIpThrottle(30, 500))
  @UseGuards(IpBlockGuard)
  @HttpCode(200)
  @Post('request-password-reset')
  async requestPasswordReset(
    @Request() req: AuthenticatedRequest,
    @Body() requestPasswordResetDto: RequestPasswordResetDto,
  ) {
    const ip = this.ipBlockService.getClientIp(req);
    try {
      await this.authService.requestPasswordReset(requestPasswordResetDto);
      return { success: true };
    } catch (error) {
      this.ipBlockService.recordFailedAttempt(ip);
      throw error;
    }
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
  async verifyResetCode(
    @Request() req: AuthenticatedRequest,
    @Body() verifyResetCodeDto: VerifyResetCodeDto,
  ) {
    const ip = this.ipBlockService.getClientIp(req);

    const result = await this.authService.verifyResetCode(verifyResetCodeDto);

    if (result.success) {
      this.ipBlockService.resetAttempts(ip);
      return { success: true };
    }

    this.ipBlockService.recordFailedAttempt(ip);
    throw new BadRequestException('errors.invalidCode');
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
  async resetPassword(
    @Request() req: AuthenticatedRequest,
    @Body() resetPasswordDto: ResetPasswordDto,
  ) {
    const ip = this.ipBlockService.getClientIp(req);

    try {
      const user = await this.authService.resetPassword(resetPasswordDto);
      this.ipBlockService.resetAttempts(ip);
      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          type: user.type,
          firstName: user.firstName,
          lastName: user.lastName,
          companyName: user.companyName,
          companyWebsiteUrl: user.companyWebsiteUrl,
          phone: user.phone,
        },
      };
    } catch (error) {
      this.ipBlockService.recordFailedAttempt(ip);
      throw error;
    }
  }
}
