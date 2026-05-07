import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';

import { AdminGuard } from '../../auth/infrastructure/guards/admin.guard';
import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import {
  buildPaginationMeta,
  parseLimitQuery,
  parsePageQuery,
} from '../../common/utils/pagination.utils';
import { getParserCatalog, getParserCatalogForAdminApi } from '../application/parser-catalog';
import { resolveParsingTargetEnv } from '../application/parsing-env';
import { ParsingOrchestratorService } from '../application/parsing-orchestrator.service';
import { ParsingScheduleService } from '../application/parsing-schedule.service';

import { CreateParserScheduleDto } from './dto/create-parser-schedule.dto';
import { CreatePdpRunDto } from './dto/create-pdp-run.dto';
import { CreatePlpRunDto } from './dto/create-plp-run.dto';
import { CreateSyncRunDto } from './dto/create-sync-run.dto';
import { PatchParserScheduleStatusDto } from './dto/patch-parser-schedule-status.dto';
import { UpdateParserScheduleDto } from './dto/update-parser-schedule.dto';

function getDefaultParserCode(): string {
  const parserCode = getParserCatalog()[0]?.code;
  if (!parserCode) {
    throw new Error('Parser catalog is empty');
  }
  return parserCode;
}

@ApiTags('admin-parsing')
@ApiBearerAuth('JWT-auth')
@Controller('api/admin/parsing')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminParsingController {
  constructor(
    private readonly orchestrator: ParsingOrchestratorService,
    private readonly schedules: ParsingScheduleService,
  ) {}

  @Get('catalog')
  @ApiOperation({ summary: 'Parser catalog for admin UI' })
  getCatalog() {
    return {
      data: getParserCatalogForAdminApi(),
      meta: { targetEnv: resolveParsingTargetEnv() },
    };
  }

  @Get('parsers/:parserCode/plp-files')
  @ApiOperation({ summary: 'Available PLP files for parser' })
  async listParserPlpFiles(@Param('parserCode') parserCode: string): Promise<unknown> {
    return {
      data: await this.orchestrator.listParserPlpFiles(parserCode),
    };
  }

  @Get('plp-files')
  @ApiOperation({ summary: 'List all available PLP files' })
  async listAllPlpFiles(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    const pageNum = parsePageQuery(page);
    const limitNum = parseLimitQuery(limit, { defaultValue: 20, maxValue: 100 });
    const all = await this.orchestrator.listAllPlpFiles();
    const total = all.length;
    const { totalPages } = buildPaginationMeta(total, pageNum, limitNum);
    const safePage = Math.min(pageNum, totalPages);
    const start = (safePage - 1) * limitNum;
    const data = all.slice(start, start + limitNum);
    return {
      data,
      meta: {
        total,
        page: safePage,
        limit: limitNum,
        totalPages,
      },
    };
  }

  @Get('parsers/:parserCode/plp-files/:fileKey/download')
  @ApiOperation({ summary: 'Download PLP file by key' })
  async downloadPlpFile(
    @Param('parserCode') parserCode: string,
    @Param('fileKey') fileKey: string,
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.orchestrator.getPlpFileContentByKey(parserCode, fileKey);
    if (file.missing || file.content === null) {
      res.status(404).json({ message: 'errors.parsingPlpFileInvalid' });
      return;
    }
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(file.fileName)}"`,
    );
    res.send(file.content);
  }

  @Get('parsers/:parserCode/plp-files/:fileKey/sync-hint')
  @ApiOperation({
    summary:
      'PLP file hints (login, suggested assigned user id, login/file match) for registry sync and PDP forms',
  })
  async getRegistrySyncHint(
    @Param('parserCode') parserCode: string,
    @Param('fileKey') fileKey: string,
  ): Promise<unknown> {
    return this.orchestrator.getRegistrySyncHint(parserCode, fileKey);
  }

  @Post('parsers/:parserCode/plp-files/:fileKey/sync-runs')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Queue registry seed (sync) run for a PLP file' })
  async createSyncRun(
    @Req() req: Request,
    @Param('parserCode') parserCode: string,
    @Param('fileKey') fileKey: string,
    @Body() dto: CreateSyncRunDto,
  ): Promise<unknown> {
    const user = req.user as { id: string };
    return this.orchestrator.createSyncRun({
      adminUserId: user.id,
      parserCode,
      plpFileKey: fileKey,
      assignedUserId: dto.assignedUserId,
    });
  }

  @Get('parsers/:parserCode/plp-files/:fileKey')
  @ApiOperation({ summary: 'Get PLP file content by key' })
  async getPlpFileByKey(
    @Param('parserCode') parserCode: string,
    @Param('fileKey') fileKey: string,
  ): Promise<unknown> {
    return this.orchestrator.getPlpFileContentByKey(parserCode, fileKey);
  }

  @Delete('parsers/:parserCode/plp-files/:fileKey')
  @ApiOperation({ summary: 'Delete PLP file by key' })
  async deletePlpFileByKey(
    @Param('parserCode') parserCode: string,
    @Param('fileKey') fileKey: string,
  ): Promise<{ ok: boolean }> {
    await this.orchestrator.deletePlpFile(parserCode, fileKey);
    return { ok: true };
  }

  @Get('plp-runs')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'List PLP parser runs' })
  async listPlpRuns(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    return this.orchestrator.listRuns({
      runType: 'plp',
      page: parsePageQuery(page),
      limit: parseLimitQuery(limit, { defaultValue: 20, maxValue: 100 }),
    });
  }

  @Get('pdp-runs')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'List PDP parser runs' })
  async listPdpRuns(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    return this.orchestrator.listRuns({
      runType: 'pdp',
      page: parsePageQuery(page),
      limit: parseLimitQuery(limit, { defaultValue: 20, maxValue: 100 }),
    });
  }

  @Get('runs/:id')
  @ApiOperation({ summary: 'Get parser run by id' })
  async getRun(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.orchestrator.getRun(id);
  }

  @Get('runs/:id/logs')
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  @ApiOperation({ summary: 'Log chunks after seq' })
  async getLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('afterSeq') afterSeq?: string,
  ): Promise<unknown> {
    const parsed = afterSeq !== undefined && afterSeq !== '' ? Number.parseInt(afterSeq, 10) : 0;
    const seq = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
    const chunks = await this.orchestrator.getLogChunks(id, seq);
    return { data: chunks };
  }

  @Get('runs/:id/report')
  @ApiOperation({ summary: 'Normalized report view-model' })
  async getReport(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.orchestrator.getReportViewModel(id);
  }

  @Get('runs/:id/current-plp-file')
  @ApiOperation({ summary: 'Current PLP file view-model' })
  async getCurrentPlpFile(@Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    return this.orchestrator.getCurrentPlpFileViewModel(id);
  }

  @Post('plp-runs')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Start manual PLP run' })
  async createPlpRun(@Req() req: Request, @Body() dto: CreatePlpRunDto): Promise<unknown> {
    const user = req.user as { id: string };
    return this.orchestrator.createPlpRun({
      adminUserId: user.id,
      parserCode: dto.parserCode ?? getDefaultParserCode(),
      assignedUserId: dto.assignedUserId,
      scanMode: dto.scanMode,
      pagesFirst: dto.pagesFirst,
      pageFrom: dto.pageFrom,
      pageTo: dto.pageTo,
      login: dto.login,
      pageSize: dto.pageSize,
      maxItems: dto.maxItems,
      delayMs: dto.delayMs ?? 3000,
      dryRun: dto.dryRun,
    });
  }

  @Post('pdp-runs')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Start manual PDP run' })
  async createPdpRun(@Req() req: Request, @Body() dto: CreatePdpRunDto): Promise<unknown> {
    const user = req.user as { id: string };
    return this.orchestrator.createPdpRun({
      adminUserId: user.id,
      parserCode: dto.parserCode ?? getDefaultParserCode(),
      assignedUserId: dto.assignedUserId,
      plpFileKey: dto.plpFileKey,
      listingStatus: dto.listingStatus,
      limit: dto.limit,
      resume: dto.resume,
      dryRun: dto.dryRun,
      onlyFailed: dto.onlyFailed,
      updateExisting: dto.updateExisting,
      registrationType: dto.registrationType,
      defaultHp: dto.defaultHp,
      city: dto.city,
      delayMs: dto.delayMs ?? 3000,
      removeClosed: dto.removeClosed,
      checkUserDuplicatesBeforeCreate: dto.checkUserDuplicatesBeforeCreate,
    });
  }

  @Post('runs/:id/cancel')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Request cancel for active run' })
  async cancelRun(@Req() req: Request, @Param('id', ParseUUIDPipe) id: string): Promise<unknown> {
    const user = req.user as { id: string };
    return this.orchestrator.requestCancelRun(id, user.id);
  }

  @Get('schedules')
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @ApiOperation({ summary: 'List parser schedules' })
  async listSchedules(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ): Promise<unknown> {
    return this.schedules.listSchedules({
      page: parsePageQuery(page),
      limit: parseLimitQuery(limit, { defaultValue: 20, maxValue: 100 }),
    });
  }

  @Post('schedules')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Create parser schedule' })
  async createSchedule(
    @Req() req: Request,
    @Body() dto: CreateParserScheduleDto,
  ): Promise<unknown> {
    const user = req.user as { id: string };
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.schedules.createSchedule({
      adminUserId: user.id,
      parserCode: dto.parserCode ?? getDefaultParserCode(),
      runType: dto.runType,
      assignedUserId: dto.assignedUserId,
      frequencyPreset: dto.frequencyPreset,
      everyNHours: dto.everyNHours,
      everyNDays: dto.everyNDays,
      presetTime: dto.presetTime,
      presetWeekday: dto.presetWeekday,
      cronExpression: dto.cronExpression,
      timezone: dto.timezone,
      configSnapshot: dto.configSnapshot,
      ip,
      userAgent,
    });
  }

  @Patch('schedules/:id')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Update parser schedule' })
  async updateSchedule(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateParserScheduleDto,
  ): Promise<unknown> {
    const user = req.user as { id: string };
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.schedules.updateSchedule({
      id,
      adminUserId: user.id,
      frequencyPreset: dto.frequencyPreset,
      everyNHours: dto.everyNHours,
      everyNDays: dto.everyNDays,
      presetTime: dto.presetTime,
      presetWeekday: dto.presetWeekday,
      cronExpression: dto.cronExpression,
      timezone: dto.timezone,
      configSnapshot: dto.configSnapshot,
      ip,
      userAgent,
    });
  }

  @Patch('schedules/:id/status')
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @ApiOperation({ summary: 'Activate or deactivate schedule' })
  async patchScheduleStatus(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PatchParserScheduleStatusDto,
  ): Promise<unknown> {
    const user = req.user as { id: string };
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.schedules.setScheduleStatus({
      id,
      adminUserId: user.id,
      status: dto.status,
      ip,
      userAgent,
    });
  }

  @Delete('schedules/:id')
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @ApiOperation({ summary: 'Soft-delete parser schedule' })
  async deleteSchedule(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    const user = req.user as { id: string };
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] as string | undefined;
    await this.schedules.softDeleteSchedule({ id, adminUserId: user.id, ip, userAgent });
    return { ok: true };
  }

  @Post('schedules/:id/run-now')
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @ApiOperation({ summary: 'Run schedule immediately' })
  async runScheduleNow(
    @Req() req: Request,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<unknown> {
    const user = req.user as { id: string };
    const ip = req.ip;
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.schedules.runScheduleNow({ id, adminUserId: user.id, ip, userAgent });
  }
}
