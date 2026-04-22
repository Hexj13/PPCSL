import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/infrastructure/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../common/express-augmentation';

import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@ApiTags('devices')
@Controller('api/devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Register mobile push token' })
  @ApiResponse({ status: 201, description: 'Device registered' })
  async register(@Request() req: AuthenticatedRequest, @Body() dto: RegisterDeviceDto) {
    await this.devicesService.register(req.user.id, dto.pushToken, dto.platform);
    return { ok: true };
  }
}
