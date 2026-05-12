import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import { Injectable, Logger } from '@nestjs/common';

import { getParserCatalogItem } from '../application/parser-catalog';
import type { ParserTargetEnv } from '../domain/types';

export interface CliParserRunHandle {
  pid: number;
  child: ChildProcessWithoutNullStreams;
}

@Injectable()
export class CliParserRunnerService {
  private readonly logger = new Logger(CliParserRunnerService.name);

  runScan(params: {
    parserCode: string;
    env: ParserTargetEnv;
    pages: number;
    pageFrom?: number;
    pageTo?: number;
    login?: string;
    pageSize?: number;
    maxItems?: number;
    dryRun?: boolean;
    delayMs: number;
    extraEnv: NodeJS.ProcessEnv;
    onStdoutLine: (line: string) => void;
    onStderrLine: (line: string) => void;
    onProcessError?: (error: Error) => void;
  }): CliParserRunHandle {
    const args = this.buildScanArgs(params);
    return this.spawnCli(
      params.parserCode,
      args,
      params.extraEnv,
      params.onStdoutLine,
      params.onStderrLine,
      params.onProcessError,
    );
  }

  runSeedRegistry(params: {
    parserCode: 'cipauto' | '999md' | 'autooutlet';
    env: ParserTargetEnv;
    userId: string;
    login?: string;
    extraEnv: NodeJS.ProcessEnv;
    onStdoutLine: (line: string) => void;
    onStderrLine: (line: string) => void;
    onProcessError?: (error: Error) => void;
  }): CliParserRunHandle {
    const backendRoot = process.cwd();
    const entry = this.resolveSeedRegistryEntrypoint(backendRoot, params.parserCode);
    const argv = this.buildSeedRegistryArgs(params);
    const child = spawn(process.execPath, this.buildNodeArgs(backendRoot, entry, argv), {
      cwd: backendRoot,
      env: { ...process.env, ...params.extraEnv },
      shell: false,
    }) as ChildProcessWithoutNullStreams;
    this.logger.log(
      `[CLI][seed-registry] parser=${params.parserCode} mode=${entry.kind} args=${JSON.stringify(argv)}`,
    );
    child.once('error', (error) => {
      this.logger.error(`[CLI][seed-registry][process-error] ${error.message}`);
      params.onProcessError?.(error);
    });
    this.pipeLines(child.stdout, params.onStdoutLine);
    this.pipeLines(child.stderr, params.onStderrLine);
    return { pid: child.pid ?? 0, child };
  }

  runImport(params: {
    parserCode: string;
    env: ParserTargetEnv;
    userId: string;
    status: 'active' | 'paused';
    limit?: number;
    resume?: boolean;
    dryRun?: boolean;
    removeClosed?: boolean;
    onlyFailed?: boolean;
    updateExisting?: boolean;
    registrationType: string;
    defaultHp: number;
    city: string;
    delayMs: number;
    plpFilePath?: string;
    checkUserDuplicatesBeforeCreate?: boolean;
    autoCreateBrands?: boolean;
    autoCreateModels?: boolean;
    extraEnv: NodeJS.ProcessEnv;
    onStdoutLine: (line: string) => void;
    onStderrLine: (line: string) => void;
    onProcessError?: (error: Error) => void;
  }): CliParserRunHandle {
    const args = this.buildImportArgs(params);
    return this.spawnCli(
      params.parserCode,
      args,
      params.extraEnv,
      params.onStdoutLine,
      params.onStderrLine,
      params.onProcessError,
    );
  }

  stopGraceful(child: ChildProcessWithoutNullStreams): void {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
  }

  stopForce(child: ChildProcessWithoutNullStreams): void {
    if (!child.killed) {
      child.kill('SIGKILL');
    }
  }

  private buildScanArgs(params: {
    env: ParserTargetEnv;
    pages: number;
    pageFrom?: number;
    pageTo?: number;
    login?: string;
    pageSize?: number;
    maxItems?: number;
    dryRun?: boolean;
    delayMs: number;
  }): string[] {
    const parts = ['scan', '--env', params.env, '--delay', String(params.delayMs)];

    if (params.login) {
      parts.push('--login', params.login, '--page-size', String(params.pageSize ?? 50));
      if (params.maxItems !== undefined) {
        parts.push('--max-items', String(params.maxItems));
      }
    } else {
      parts.push('--pages', String(params.pages));
      if (params.pageFrom !== undefined) {
        parts.push('--page-from', String(params.pageFrom));
      }
      if (params.pageTo !== undefined) {
        parts.push('--page-to', String(params.pageTo));
      }
    }
    if (params.dryRun) {
      parts.push('--dry-run');
    }
    return parts;
  }

  private buildImportArgs(params: {
    parserCode: string;
    env: ParserTargetEnv;
    userId: string;
    status: 'active' | 'paused';
    limit?: number;
    resume?: boolean;
    dryRun?: boolean;
    removeClosed?: boolean;
    onlyFailed?: boolean;
    updateExisting?: boolean;
    registrationType: string;
    defaultHp: number;
    city: string;
    delayMs: number;
    plpFilePath?: string;
    checkUserDuplicatesBeforeCreate?: boolean;
    autoCreateBrands?: boolean;
    autoCreateModels?: boolean;
  }): string[] {
    const parts = [
      'import',
      '--userId',
      params.userId,
      '--env',
      params.env,
      '--status',
      params.status,
      '--registration-type',
      params.registrationType,
      '--default-hp',
      String(params.defaultHp),
      '--city',
      params.city,
      '--delay',
      String(params.delayMs),
    ];
    if (params.limit !== undefined) {
      parts.push('--limit', String(params.limit));
    }
    if (params.resume) {
      parts.push('--resume');
    }
    if (params.dryRun) {
      parts.push('--dry-run');
    }
    if (params.removeClosed) {
      parts.push('--remove-closed');
    }
    if (params.onlyFailed) {
      parts.push('--only-failed');
    }
    if (params.updateExisting) {
      parts.push('--update-existing');
    }
    if (params.plpFilePath) {
      parts.push('--plp-file', params.plpFilePath);
    }
    if (params.checkUserDuplicatesBeforeCreate) {
      parts.push('--check-user-duplicates-before-create');
    }
    if (params.autoCreateBrands) {
      parts.push('--auto-create-brands');
    }
    if (params.autoCreateModels) {
      parts.push('--auto-create-models');
    }
    return parts;
  }

  private spawnCli(
    parserCode: string,
    commandArgs: string[],
    extraEnv: NodeJS.ProcessEnv,
    onStdoutLine: (line: string) => void,
    onStderrLine: (line: string) => void,
    onProcessError?: (error: Error) => void,
  ): CliParserRunHandle {
    const backendRoot = process.cwd();
    const cliEntry = this.resolveCliEntrypoint(backendRoot, parserCode);
    const custom = this.resolveCustomCommand(parserCode);
    const mode = custom ? 'custom' : cliEntry.kind === 'js' ? 'node' : 'ts-node';
    this.logger.log(
      `[CLI][spawn] parser=${parserCode} mode=${mode} args=${JSON.stringify(commandArgs)}`,
    );
    const child = custom
      ? this.spawnCustomShell(custom.command, custom.args, commandArgs, extraEnv)
      : spawn(process.execPath, this.buildNodeArgs(backendRoot, cliEntry, commandArgs), {
          cwd: backendRoot,
          env: { ...process.env, ...extraEnv },
          shell: false,
        });
    const proc = child as ChildProcessWithoutNullStreams;
    proc.once('error', (error) => {
      this.logger.error(`[CLI][process-error] parser=${parserCode} ${error.message}`);
      onProcessError?.(error);
    });
    this.pipeLines(proc.stdout, onStdoutLine);
    this.pipeLines(proc.stderr, onStderrLine);
    return { pid: proc.pid ?? 0, child: proc };
  }

  private buildNodeArgs(
    backendRoot: string,
    cliEntry: { kind: 'js' | 'ts'; path: string },
    commandArgs: string[],
  ): string[] {
    const preloadArgs = this.resolvePartnerImportCliPreloadArgs(backendRoot);
    if (cliEntry.kind === 'js') {
      return [...preloadArgs, cliEntry.path, ...commandArgs];
    }
    return [
      ...preloadArgs,
      '-r',
      require.resolve('ts-node/register'),
      '-r',
      require.resolve('tsconfig-paths/register'),
      cliEntry.path,
      ...commandArgs,
    ];
  }

  private resolvePartnerImportCliPreloadArgs(backendRoot: string): string[] {
    const preload = path.join(backendRoot, 'scripts', 'partner-import-cli-preload.cjs');
    if (!fs.existsSync(preload)) {
      this.logger.warn(`[CLI] partner preload missing at ${preload}`);
      return [];
    }
    return ['-r', preload];
  }

  private resolveSeedRegistryEntrypoint(
    backendRoot: string,
    parserCode: 'cipauto' | '999md' | 'autooutlet',
  ): { kind: 'js' | 'ts'; path: string } {
    const relative =
      parserCode === 'cipauto'
        ? 'cipauto-import/commands/seed-registry.ts'
        : parserCode === '999md'
          ? '999md-import/commands/seed-registry.ts'
          : 'autooutlet-import/commands/seed-registry.ts';
    const compiled = relative.replace(/\.ts$/, '.js');
    const distPath = path.join(backendRoot, 'dist', 'scripts', 'tools', compiled);
    if (fs.existsSync(distPath)) {
      return { kind: 'js', path: distPath };
    }
    const srcPath = path.join(backendRoot, 'src', 'scripts', 'tools', relative);
    if (fs.existsSync(srcPath)) {
      return { kind: 'ts', path: srcPath };
    }
    throw new Error(`seed-registry script not found for "${parserCode}".`);
  }

  private buildSeedRegistryArgs(params: {
    parserCode: 'cipauto' | '999md' | 'autooutlet';
    env: ParserTargetEnv;
    userId: string;
    login?: string;
  }): string[] {
    if (params.parserCode === 'cipauto' || params.parserCode === 'autooutlet') {
      return ['--env', params.env, params.userId];
    }
    const login = params.login?.trim() ?? '';
    if (!login) {
      throw new Error('999md seed-registry requires login.');
    }
    return ['--login', login, '--userId', params.userId, '--env', params.env];
  }

  private resolveCliEntrypoint(
    backendRoot: string,
    parserCode: string,
  ): { kind: 'js' | 'ts'; path: string } {
    const catalogItem = getParserCatalogItem(parserCode);
    if (!catalogItem?.cliScript) {
      throw new Error(`Parser "${parserCode}" CLI entrypoint is missing in parser catalog.`);
    }
    const compiledCliScript = catalogItem.cliScript.replace(/\.ts$/, '.js');
    const distPath = path.join(backendRoot, 'dist', 'scripts', 'tools', compiledCliScript);
    if (fs.existsSync(distPath)) {
      return { kind: 'js', path: distPath };
    }
    const srcPath = path.join(backendRoot, 'src', 'scripts', 'tools', catalogItem.cliScript);
    if (fs.existsSync(srcPath)) {
      return { kind: 'ts', path: srcPath };
    }
    this.logger.error(
      `Parser CLI not found for "${parserCode}". Checked dist=${distPath} and src=${srcPath}`,
    );
    throw new Error(`Parser "${parserCode}" CLI entrypoint is missing.`);
  }

  private resolveCustomCommand(
    parserCode: string,
  ): { command: string; args: string[]; envKey: string } | null {
    const envKey = `ADMIN_PARSING_CLI_OVERRIDE_${this.toEnvSuffix(parserCode)}`;
    const custom = process.env[envKey]?.trim();
    const legacy =
      parserCode === 'cipauto' ? process.env.ADMIN_PARSING_CIPAUTO_CLI?.trim() || '' : '';
    const commandValue = custom || legacy;
    if (!commandValue) {
      return null;
    }
    const parsed = this.parseCustomCommand(
      commandValue,
      custom ? envKey : 'ADMIN_PARSING_CIPAUTO_CLI',
    );
    return { ...parsed, envKey: custom ? envKey : 'ADMIN_PARSING_CIPAUTO_CLI' };
  }

  private toEnvSuffix(parserCode: string): string {
    return parserCode
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '_');
  }

  private spawnCustomShell(
    command: string,
    args: string[],
    commandArgs: string[],
    extraEnv: NodeJS.ProcessEnv,
  ): ChildProcessWithoutNullStreams {
    return spawn(command, [...args, ...commandArgs], {
      cwd: process.cwd(),
      env: { ...process.env, ...extraEnv },
      shell: false,
    }) as ChildProcessWithoutNullStreams;
  }

  private parseCustomCommand(custom: string, envKey: string): { command: string; args: string[] } {
    const parts: string[] = [];
    let current = '';
    let quote: '"' | "'" | null = null;
    let escaped = false;

    for (const char of custom) {
      if (escaped) {
        current += char;
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (quote) {
        if (char === quote) {
          quote = null;
        } else {
          current += char;
        }
        continue;
      }
      if (char === '"' || char === "'") {
        quote = char;
        continue;
      }
      if (/\s/.test(char)) {
        if (current) {
          parts.push(current);
          current = '';
        }
        continue;
      }
      current += char;
    }

    if (escaped) {
      current += '\\';
    }
    if (quote) {
      throw new Error(`Invalid ${envKey} value.`);
    }
    if (current) {
      parts.push(current);
    }

    const [command, ...args] = parts;
    if (!command) {
      throw new Error(`${envKey} must include a command.`);
    }
    return { command, args };
  }

  private pipeLines(stream: NodeJS.ReadableStream, onLine: (line: string) => void): void {
    let buffer = '';
    stream.on('data', (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.length > 0) {
          onLine(line);
        }
      }
    });
    stream.on('end', () => {
      if (buffer.trim().length > 0) {
        onLine(buffer);
      }
    });
  }
}
