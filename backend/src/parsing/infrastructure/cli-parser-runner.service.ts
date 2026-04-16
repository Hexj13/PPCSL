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
    resume?: boolean;
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
    resume?: boolean;
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
    if (params.resume) {
      parts.push('--resume');
    }
    if (params.dryRun) {
      parts.push('--dry-run');
    }
    return parts;
  }

  private buildImportArgs(params: {
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
    const cliTs = this.resolveCliEntrypoint(backendRoot, parserCode);
    const custom = this.resolveCustomCommand(parserCode);
    this.logger.log(
      `[CLI][spawn] parser=${parserCode} mode=${custom ? 'custom' : 'ts-node'} args=${JSON.stringify(commandArgs)}`,
    );
    const child = custom
      ? this.spawnCustomShell(custom.command, custom.args, commandArgs, extraEnv)
      : spawn(
          process.execPath,
          [
            '-r',
            require.resolve('ts-node/register'),
            '-r',
            require.resolve('tsconfig-paths/register'),
            cliTs,
            ...commandArgs,
          ],
          {
            cwd: backendRoot,
            env: { ...process.env, ...extraEnv },
            shell: false,
          },
        );
    const proc = child as ChildProcessWithoutNullStreams;
    proc.once('error', (error) => {
      this.logger.error(`[CLI][process-error] parser=${parserCode} ${error.message}`);
      onProcessError?.(error);
    });
    this.pipeLines(proc.stdout, onStdoutLine);
    this.pipeLines(proc.stderr, onStderrLine);
    return { pid: proc.pid ?? 0, child: proc };
  }

  private resolveCliEntrypoint(backendRoot: string, parserCode: string): string {
    const catalogItem = getParserCatalogItem(parserCode);
    if (!catalogItem?.cliScript) {
      throw new Error(`Parser "${parserCode}" CLI entrypoint is missing in parser catalog.`);
    }
    const cliPath = path.join(backendRoot, 'src', 'scripts', 'tools', catalogItem.cliScript);
    if (!fs.existsSync(cliPath)) {
      this.logger.error(`Parser CLI not found for "${parserCode}" at ${cliPath}`);
      throw new Error(`Parser "${parserCode}" CLI entrypoint is missing.`);
    }
    return cliPath;
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
