import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

import {
  ADMIN_AUDIT_LOG_RETENTION_MONTHS,
  AdminAuditRetentionService,
} from './admin-audit-retention.service';
import { AdminAuditLog } from './entities/admin-audit-log.entity';

jest.mock('@sentry/node', () => ({
  withMonitor: jest.fn((_name: string, fn: () => Promise<unknown>) => fn()),
}));

describe('AdminAuditRetentionService', () => {
  let service: AdminAuditRetentionService;
  let execute: jest.Mock;
  let where: jest.Mock;

  beforeEach(async () => {
    execute = jest.fn().mockResolvedValue({ affected: 2 });
    where = jest.fn().mockReturnValue({ execute });
    const from = jest.fn().mockReturnValue({ where });
    const deleteFn = jest.fn().mockReturnValue({ from });
    const auditLogRepository = {
      createQueryBuilder: jest.fn().mockReturnValue({ delete: deleteFn }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminAuditRetentionService,
        { provide: getRepositoryToken(AdminAuditLog), useValue: auditLogRepository },
      ],
    }).compile();

    service = module.get(AdminAuditRetentionService);
  });

  it('deletes audit log rows older than 12 months', async () => {
    const result = await service.purgeExpired();
    expect(where).toHaveBeenCalledWith(`created_at < now() - (:months * interval '1 month')`, {
      months: ADMIN_AUDIT_LOG_RETENTION_MONTHS,
    });
    expect(result.deleted).toBe(2);
  });
});
