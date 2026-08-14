import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AdminAuditLog } from './entities/admin-audit-log.entity';

export const ADMIN_AUDIT_LOG_RETENTION_MONTHS = 12;

@Injectable()
export class AdminAuditRetentionService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditLogRepository: Repository<AdminAuditLog>,
  ) {}

  async purgeExpired(): Promise<{ deleted: number }> {
    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .from(AdminAuditLog)
      .where(`created_at < now() - (:months * interval '1 month')`, {
        months: ADMIN_AUDIT_LOG_RETENTION_MONTHS,
      })
      .execute();
    return { deleted: result.affected ?? 0 };
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async handleCleanup(): Promise<void> {
    const Sentry = await import('@sentry/node');
    return Sentry.withMonitor(
      'admin-audit-log-retention',
      async () => {
        await this.purgeExpired();
      },
      {
        schedule: {
          type: 'crontab',
          value: '0 4 * * *',
        },
        checkinMargin: 5,
        maxRuntime: 10,
      },
    );
  }
}
