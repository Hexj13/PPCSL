import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifySmsDto } from './dto/verify-sms.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { IpBlockGuard } from './guards/ip-block.guard';
import { IpBlockService } from './services/ip-block.service';

@Controller('api/auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private ipBlockService: IpBlockService,
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

  @UseGuards(IpBlockGuard)
  @Post('verify-sms')
  async verifySms(@Request() req, @Body() verifySmsDto: VerifySmsDto) {
    const ip = this.ipBlockService.getClientIp(req);

    if (verifySmsDto.code === '000000') {
      this.ipBlockService.resetAttempts(ip);
      return { success: true, message: 'Кодот е успешно верифициран' };
    }

    this.ipBlockService.recordFailedAttempt(ip);
    throw new BadRequestException('Невалиден код. Обидете се повторно.');
  }
}
