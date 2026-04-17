import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { DiagnosticsService, type ImageHeadStatusResult } from './diagnostics.service';

const isProduction = process.env.NODE_ENV === 'production';
const getThrottleLimit = (prodLimit: number, devLimit: number = prodLimit * 100) => ({
  default: { limit: isProduction ? prodLimit : devLimit, ttl: 60000 },
});

@ApiTags('diagnostics')
@Controller('api/diagnostics')
export class DiagnosticsController {
  constructor(private readonly diagnosticsService: DiagnosticsService) {}

  @ApiOperation({ summary: 'HEAD status for allowlisted image URLs' })
  @ApiQuery({ name: 'url', required: true, type: String })
  @ApiResponse({
    status: 200,
    description: 'HEAD result',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'number', nullable: true },
        reason: { type: 'string', nullable: true },
      },
    },
  })
  @Throttle(getThrottleLimit(60, 1000))
  @Get('image-status')
  imageStatus(@Query('url') url: string | undefined): Promise<ImageHeadStatusResult> {
    return this.diagnosticsService.getImageHeadStatus(url ?? '');
  }
}
