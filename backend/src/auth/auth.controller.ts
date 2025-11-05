import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from '../users/users.service';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { SendSmsDto } from './dto/send-sms.dto';
import { VerifySmsDto } from './dto/verify-sms.dto';
import { IpBlockGuard } from './guards/ip-block.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IpBlockService } from './services/ip-block.service';
import { SmsService } from './services/sms.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private ipBlockService: IpBlockService,
    private smsService: SmsService,
    private usersService: UsersService,
  ) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    const user = await this.authService.getUserProfile(req.user.id);
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-phone')
  async verifyPhone(@Request() req) {
    const user = await this.authService.verifyPhone(req.user.id);
    return user;
  }

  @Post('check-phone')
  async checkPhone(@Body() sendSmsDto: SendSmsDto) {
    const normalizedPhone = this.smsService.normalizePhoneNumber(sendSmsDto.phone);
    const existingUser = await this.usersService.findByPhone(normalizedPhone);

    if (existingUser) {
      throw new BadRequestException('Корисник со овој телефон веќе постои');
    }

    return { available: true };
  }

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
}
