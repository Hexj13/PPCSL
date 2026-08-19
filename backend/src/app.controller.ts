import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { AppService } from './app.service';

@ApiTags('app')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @ApiOperation({ summary: 'Check API status' })
  @ApiResponse({
    status: 200,
    description: 'API is active',
    content: {
      'text/plain': {
        schema: {
          type: 'string',
          example: 'API v1.0',
        },
      },
    },
  })
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
