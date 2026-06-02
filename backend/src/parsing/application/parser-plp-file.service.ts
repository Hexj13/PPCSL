import * as fs from 'node:fs';
import { promises as fsp } from 'node:fs';
import * as path from 'node:path';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { resolveParsingRuntimeRoot } from '../../common/parsing-runtime-path';
import { ParserRun } from '../infrastructure/persistence/parser-run.entity';
import { PlpStorageService } from '../infrastructure/plp-storage.service';

import { getParserCatalogItem } from './parser-catalog';
import {
  get999mdCurrentPlpDir,
  getParserReportsDir,
  normalizeSyncPlpFileKey,
  resolveParserPlpDataPath,
  resolveS3RelativePath,
  toLoginFileSlug,
} from './parser-plp-path.util';
import { stringifyError } from './stringify-error.util';

@Injectable()
export class ParserPlpFileService {
  private readonly logger = new Logger(ParserPlpFileService.name);

  constructor(
    @InjectRepository(ParserRun)
    private readonly runRepo: Repository<ParserRun>,
    private readonly plpStorage: PlpStorageService,
  ) {}

  resolveCurrentPlpFilePath(run: ParserRun): string {
    if (run.parser_code === '999md') {
      const loginRaw = run.config_snapshot?.login;
      if (typeof loginRaw === 'string' && loginRaw.trim().length > 0) {
        const loginSlug = toLoginFileSlug(loginRaw);
        return path.join(get999mdCurrentPlpDir(), `${loginSlug}.json`);
      }
    }

    const parser = getParserCatalogItem(run.parser_code);
    if (parser?.plpDataPath) {
      return resolveParserPlpDataPath(parser.plpDataPath);
    }
    throw new NotFoundException('errors.parserRunNotFound');
  }

  getParserPlpMode(parserCode: string): 'mono' | 'multi' {
    const parser = getParserCatalogItem(parserCode);
    if (!parser) {
      throw new NotFoundException('errors.parserRunNotFound');
    }
    return parser.plpMode;
  }

  resolvePlpOutputFileKey(parserCode: string, configSnapshot: Record<string, unknown>): string {
    const parser = getParserCatalogItem(parserCode);
    if (!parser) {
      throw new NotFoundException('errors.parserRunNotFound');
    }
    let fileKey = 'default';
    if (parser.scanInputMode === 'profile_login') {
      const loginRaw = String(configSnapshot.login ?? '').trim();
      if (!loginRaw) {
        throw new BadRequestException('errors.parsingLoginRequired');
      }
      fileKey = `${toLoginFileSlug(loginRaw)}.json`;
    }
    if (parser.plpMode === 'mono' && fileKey !== 'default') {
      throw new BadRequestException('errors.parsingPlpModeMonoSingleFileOnly');
    }
    return fileKey;
  }

  resolvePdpPlpFilePath(parserCode: string, plpFileKey: string): string {
    const key = plpFileKey.trim();
    if (!key) {
      throw new BadRequestException('errors.parsingPlpFileRequired');
    }

    if (parserCode === '999md') {
      if (path.basename(key) !== key || !key.endsWith('.json')) {
        throw new BadRequestException('errors.parsingPlpFileInvalid');
      }
      const runtimePath = path.join(get999mdCurrentPlpDir(), key);
      if (fs.existsSync(runtimePath)) {
        return runtimePath;
      }
      const legacyPath = path.join(
        process.cwd(),
        'src',
        'scripts',
        'tools',
        '999md-import',
        'data',
        'current-plp',
        key,
      );
      if (!fs.existsSync(legacyPath)) {
        throw new BadRequestException('errors.parsingPlpFileInvalid');
      }
      return legacyPath;
    }

    const parser = getParserCatalogItem(parserCode);
    if (!parser?.plpDataPath || key !== 'default') {
      throw new BadRequestException('errors.parsingPlpFileInvalid');
    }
    const absPath = resolveParserPlpDataPath(parser.plpDataPath);
    if (!fs.existsSync(absPath)) {
      throw new BadRequestException('errors.parsingPlpFileInvalid');
    }
    return absPath;
  }

  async resolvePdpReportPath(
    run: Pick<ParserRun, 'parser_code' | 'started_at'>,
    capturedReportPath: string | null,
  ): Promise<string | null> {
    if (capturedReportPath && fs.existsSync(capturedReportPath)) {
      return capturedReportPath;
    }
    return this.findLatestParserRunReportPath(run.parser_code, run.started_at);
  }

  async resolvePdpCounters(
    reportPath: string | null,
    exitCode: number,
  ): Promise<Record<string, unknown>> {
    if (!reportPath || !fs.existsSync(reportPath)) {
      return { exitCode };
    }
    try {
      const report = JSON.parse(await fsp.readFile(reportPath, 'utf-8')) as {
        summary?: Record<string, unknown>;
      };
      return { ...(report.summary ?? {}), exitCode };
    } catch {
      return { exitCode };
    }
  }

  async findLatestParserRunReportPath(
    parserCode: string,
    startedAt: Date | null,
  ): Promise<string | null> {
    const reportsDir = getParserReportsDir(parserCode);
    if (!reportsDir || !fs.existsSync(reportsDir)) {
      return null;
    }
    const runPrefix = `${parserCode}-run-`;
    let names: string[] = [];
    try {
      names = await fsp.readdir(reportsDir);
    } catch {
      return null;
    }
    const thresholdMs = startedAt ? startedAt.getTime() - 2000 : Number.NEGATIVE_INFINITY;
    const candidates: Array<{ filePath: string; mtimeMs: number }> = [];
    for (const name of names) {
      if (!name.startsWith(runPrefix) || !name.endsWith('.json')) {
        continue;
      }
      const filePath = path.join(reportsDir, name);
      try {
        const stat = await fsp.stat(filePath);
        if (!stat.isFile() || stat.mtimeMs < thresholdMs) {
          continue;
        }
        candidates.push({ filePath, mtimeMs: stat.mtimeMs });
      } catch {
        continue;
      }
    }
    if (candidates.length === 0) {
      return null;
    }
    candidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return candidates[0].filePath;
  }

  async suggestAssignedUserIdForPlpFile(
    parserCode: string,
    plpFileKey: string,
  ): Promise<string | null> {
    const norm = normalizeSyncPlpFileKey(plpFileKey);
    const recent = await this.runRepo.find({
      where: { parser_code: parserCode },
      order: { created_at: 'DESC' },
      take: 120,
    });
    for (const run of recent) {
      const uid = run.assigned_user_id?.trim();
      if (!uid) continue;
      if (run.run_type === 'pdp') {
        const raw = String(run.config_snapshot?.plpFileKey ?? '').trim();
        if (!raw) continue;
        const fk = normalizeSyncPlpFileKey(raw);
        if (fk === norm) {
          return uid;
        }
      }
      if (run.run_type === 'plp') {
        const login = String(run.config_snapshot?.login ?? '').trim();
        if (!login) continue;
        const expected = normalizeSyncPlpFileKey(`${toLoginFileSlug(login)}.json`);
        if (expected === norm) {
          return uid;
        }
      }
    }
    return null;
  }

  async ensurePlpFileLocal(parserCode: string, plpFileKey: string): Promise<void> {
    const storageRelPath = resolveS3RelativePath(parserCode, plpFileKey);
    const localAbsPath = this.resolveLocalPlpPath(parserCode, plpFileKey);
    if (fs.existsSync(localAbsPath)) {
      return;
    }
    this.logger.log(
      `[PDP][storage] fetching PLP snapshot before import: ${storageRelPath} → ${localAbsPath}`,
    );
    const ok = await this.plpStorage.downloadToLocal(storageRelPath, localAbsPath);
    if (!ok) {
      throw new BadRequestException('errors.parsingPlpFileInvalid');
    }
  }

  resolveLocalPlpPath(parserCode: string, plpFileKey: string): string {
    if (parserCode === '999md') {
      const key = plpFileKey.trim();
      const safeFileName = path.basename(key);
      return path.join(get999mdCurrentPlpDir(), safeFileName || `${key}.json`);
    }
    const parser = getParserCatalogItem(parserCode);
    if (parser?.plpDataPath) {
      return resolveParserPlpDataPath(parser.plpDataPath);
    }
    return path.join(resolveParsingRuntimeRoot(), parserCode, `${plpFileKey}.json`);
  }

  async syncPlpFileToS3(run: ParserRun): Promise<void> {
    try {
      const localFilePath = this.resolveCurrentPlpFilePath(run);
      if (!fs.existsSync(localFilePath)) {
        this.logger.warn(`[PLP][s3-sync] skipped — local file not found: ${localFilePath}`);
        return;
      }
      const content = await fsp.readFile(localFilePath, 'utf-8');
      const fileKey = this.resolvePlpOutputFileKey(run.parser_code, run.config_snapshot);
      const s3Path = resolveS3RelativePath(run.parser_code, fileKey);
      await this.plpStorage.uploadFile(s3Path, content);
      this.logger.log(
        `[PLP][s3-sync] uploaded runId=${run.id} parser=${run.parser_code} s3Path=${s3Path} size=${content.length}`,
      );
    } catch (error) {
      this.logger.error(
        `[PLP][s3-sync] failed runId=${run.id} parser=${run.parser_code} error=${stringifyError(error)}`,
      );
    }
  }
}
