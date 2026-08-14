import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminModule } from '../admin/admin.module';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';

import { ParserPlpFileService } from './application/parser-plp-file.service';
import { ParserRunLogWriter } from './application/parser-run-log-writer.service';
import { ParserRunRetentionService } from './application/parser-run-retention.service';
import { ParsingAvailabilityService } from './application/parsing-availability.service';
import { ParsingOrchestratorService } from './application/parsing-orchestrator.service';
import { ParsingPdpRunExecutor } from './application/parsing-pdp-run-executor.service';
import { ParsingPlpRunExecutor } from './application/parsing-plp-run-executor.service';
import { ParsingRunChildProcessHost } from './application/parsing-run-child-process.host';
import { ParsingRunLifecycleService } from './application/parsing-run-lifecycle.service';
import { ParsingScheduleCronService } from './application/parsing-schedule-cron.service';
import { ParsingScheduleService } from './application/parsing-schedule.service';
import { ParsingSyncRunExecutor } from './application/parsing-sync-run-executor.service';
import { CliParserRunnerService } from './infrastructure/cli-parser-runner.service';
import { ParserLogChunk } from './infrastructure/persistence/parser-log-chunk.entity';
import { ParserRun } from './infrastructure/persistence/parser-run.entity';
import { ParserSchedule } from './infrastructure/persistence/parser-schedule.entity';
import { PlpStorageService } from './infrastructure/plp-storage.service';
import { AdminParsingController } from './presentation/admin-parsing.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ParserRun, ParserSchedule, ParserLogChunk]),
    AuthModule,
    UsersModule,
    AdminModule,
  ],
  controllers: [AdminParsingController],
  providers: [
    CliParserRunnerService,
    PlpStorageService,
    ParserRunLogWriter,
    ParserPlpFileService,
    ParsingRunChildProcessHost,
    ParsingRunLifecycleService,
    ParsingPlpRunExecutor,
    ParsingPdpRunExecutor,
    ParsingSyncRunExecutor,
    ParsingAvailabilityService,
    ParsingOrchestratorService,
    ParsingScheduleService,
    ParsingScheduleCronService,
    ParserRunRetentionService,
  ],
})
export class ParsingModule {}
