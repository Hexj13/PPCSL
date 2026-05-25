import { Body, Controller, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/infrastructure/guards/jwt-auth.guard';
import { PhoneVerifiedGuard } from '../auth/infrastructure/guards/phone-verified.guard';
import type { AuthenticatedRequest } from '../common/express-augmentation';
import { I18nService } from '../common/i18n/i18n.service';

import { CreateSmartSelectionFilterUseCase } from './application/create-smart-selection-filter.use-case';
import type { SmartSelectionAnswers } from './domain/smart-selection.types';
import { CreateSmartSelectionDto } from './dto/create-smart-selection.dto';

@ApiTags('smart-selection')
@Controller('api/smart-selection')
export class SmartSelectionController {
  constructor(
    private readonly createSmartSelectionFilterUseCase: CreateSmartSelectionFilterUseCase,
    private readonly i18nService: I18nService,
  ) {}

  @ApiOperation({ summary: 'Create saved filter from smart selection questionnaire' })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({ status: 201, description: 'Saved filter created' })
  @ApiResponse({ status: 400, description: 'Validation error or saved filters limit reached' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post()
  @UseGuards(JwtAuthGuard, PhoneVerifiedGuard)
  create(
    @Body() dto: CreateSmartSelectionDto,
    @Request() req: AuthenticatedRequest,
    @Headers('accept-language') acceptLanguage?: string,
  ) {
    const locale = this.i18nService.getLocaleFromHeader(acceptLanguage);
    const answers: SmartSelectionAnswers = {
      purposes: dto.purposes,
      drivingMode: dto.drivingMode,
      budgetPreset: dto.budgetPreset,
      currency: dto.currency,
      flexibleBudget: dto.flexibleBudget ?? false,
      size: dto.size,
      bodyTypes: dto.bodyTypes,
      transmission: dto.transmission,
      fuels: dto.fuels,
      yearPreset: dto.yearPreset,
      mileagePreset: dto.mileagePreset,
      priorities: dto.priorities,
    };

    return this.createSmartSelectionFilterUseCase.execute({
      userId: req.user.id,
      answers,
      locale,
    });
  }
}
