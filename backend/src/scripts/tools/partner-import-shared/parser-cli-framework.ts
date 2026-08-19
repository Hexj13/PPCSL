import { Command } from 'commander';

import type { ImportCommandOptions, ReportCommandOptions } from './import-workflow-types';
import type { RuntimeEnv } from './platform-import-types';

export interface BaseParserCliOptions {
  env: RuntimeEnv;
}

export interface BuildParserCliParams {
  name: string;
  description: string;
}

export function buildParserCli(params: BuildParserCliParams): Command {
  return new Command().name(params.name).description(params.description);
}

export function registerImportCommand(params: {
  program: Command;
  onImport: (options: ImportCommandOptions) => Promise<void>;
  normalizeRuntimeEnv: (value?: string) => RuntimeEnv;
  normalizeCliStatus: (value?: string) => ImportCommandOptions['status'];
  normalizeRegistrationType: (value?: string) => ImportCommandOptions['registrationType'];
}): void {
  params.program
    .command('import')
    .requiredOption('--userId <uuid>')
    .option('--status <value>', 'active|paused', 'paused')
    .option('--env <value>', 'local|prod', 'local')
    .option('--limit <number>')
    .option('--resume')
    .option('--dry-run')
    .option('--only-failed')
    .option('--update-existing')
    .option('--source-id <value>')
    .option('--plp-file <path>', 'path to PLP snapshot file')
    .option('--registration-type <value>', 'Local|Foreign|Cleared')
    .option('--default-hp <number>', 'fallback horsepower', '150')
    .option('--city <value>', 'city value', 'Chișinău')
    .option('--delay <number>', 'delay between requests in ms', '3000')
    .action(async (rawOptions) => {
      if (!rawOptions.userId) {
        throw new Error('Missing required argument --userId');
      }
      const options: ImportCommandOptions = {
        userId: String(rawOptions.userId),
        status: params.normalizeCliStatus(rawOptions.status),
        env: params.normalizeRuntimeEnv(rawOptions.env),
        limit: rawOptions.limit ? Number(rawOptions.limit) : undefined,
        resume: Boolean(rawOptions.resume),
        dryRun: Boolean(rawOptions.dryRun),
        onlyFailed: Boolean(rawOptions.onlyFailed),
        updateExisting: Boolean(rawOptions.updateExisting),
        sourceId: rawOptions.sourceId ? String(rawOptions.sourceId) : undefined,
        plpFilePath: rawOptions.plpFile ? String(rawOptions.plpFile) : undefined,
        registrationType: params.normalizeRegistrationType(rawOptions.registrationType),
        defaultHp: Number(rawOptions.defaultHp),
        city: String(rawOptions.city),
        delay: Number(rawOptions.delay),
      };
      await params.onImport(options);
    });
}

export function registerReportCommand(params: {
  program: Command;
  onReport: (options: ReportCommandOptions, env: RuntimeEnv) => Promise<void>;
  normalizeRuntimeEnv: (value?: string) => RuntimeEnv;
}): void {
  params.program
    .command('report')
    .option('--file <path>')
    .option('--last')
    .option('--env <value>', 'local|prod', 'local')
    .action(async (rawOptions) => {
      const options: ReportCommandOptions = {
        file: rawOptions.file ? String(rawOptions.file) : undefined,
        last: Boolean(rawOptions.last),
      };
      const env = params.normalizeRuntimeEnv(rawOptions.env);
      await params.onReport(options, env);
    });
}
