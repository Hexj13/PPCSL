import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

import { AdminAuditLog, AuditAction, AuditEntityType } from './entities/admin-audit-log.entity';

export interface AuditLogParams {
  actorUserId: string;
  action: AuditAction;
  entityType: AuditEntityType;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AdminAuditService {
  constructor(
    @InjectRepository(AdminAuditLog)
    private readonly auditRepo: Repository<AdminAuditLog>,
  ) {}

  async log(manager: EntityManager, params: AuditLogParams): Promise<void> {
    const entry = new AdminAuditLog();
    entry.actor_user_id = params.actorUserId;
    entry.action = params.action;
    entry.entity_type = params.entityType;
    entry.entity_id = params.entityId;
    entry.before = params.before ?? null;
    entry.after = params.after ?? null;
    entry.ip = params.ip ?? null;
    entry.user_agent = params.userAgent ?? null;
    await manager.save(AdminAuditLog, entry);
  }
}
