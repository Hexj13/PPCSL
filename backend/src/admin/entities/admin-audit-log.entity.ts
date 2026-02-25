import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { User } from '../../users/entities/user.entity';

export type AuditAction =
  | 'BRAND_CREATE'
  | 'BRAND_UPDATE'
  | 'BRAND_ARCHIVE'
  | 'BRAND_UNARCHIVE'
  | 'BRAND_ACTIVE_TOGGLE'
  | 'MODEL_CREATE'
  | 'MODEL_UPDATE'
  | 'MODEL_ARCHIVE'
  | 'MODEL_UNARCHIVE'
  | 'MODEL_ACTIVE_TOGGLE';

export type AuditEntityType = 'BRAND' | 'MODEL';

@Entity('admin_audit_log')
@Index(['actor_user_id'])
@Index(['entity_type'])
@Index(['entity_id'])
@Index(['action'])
@Index(['created_at'])
export class AdminAuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  actor_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'actor_user_id' })
  actor: User;

  @Column()
  action: AuditAction;

  @Column()
  entity_type: AuditEntityType;

  @Column('uuid')
  entity_id: string;

  @Column({ type: 'jsonb', nullable: true })
  before: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  after: Record<string, unknown> | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  user_agent: string | null;

  @CreateDateColumn()
  created_at: Date;
}
