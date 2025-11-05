import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { UsersService } from '../users/users.service';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
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
  @ApiResponse({ status: 201, description: 'User successfully registered' })
  @ApiResponse({ status: 400, description: 'Invalid data' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @ApiOperation({ summary: 'Login user' })
  @ApiResponse({ status: 200, description: 'Successful login' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @ApiOperation({ summary: 'Get current user profile' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'User profile' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const user = await this.authService.getUserProfile(req.user.id);
    return user;
  }

  @ApiOperation({ summary: 'Verify phone number' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 200, description: 'Phone number verified' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Post('verify-phone')
  async verifyPhone(@Request() req) {
    const user = await this.authService.verifyPhone(req.user.id);
    return user;
  }

  @ApiOperation({ summary: 'Check if phone number is available' })
  @ApiResponse({ status: 200, description: 'Phone number availability status' })
  @ApiResponse({ status: 400, description: 'Phone number already exists' })
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
  @ApiResponse({ status: 200, description: 'SMS code sent successfully' })
  @ApiResponse({ status: 400, description: 'Phone number already exists' })
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
  @ApiResponse({ status: 200, description: 'Code verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid code' })
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
  @ApiResponse({ status: 200, description: 'Email address verified successfully' })
  @ApiResponse({ status: 400, description: 'Invalid token' })
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
}
