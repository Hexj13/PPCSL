import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import { User } from '../../../users/entities/user.entity';
import type {
  ParserRunType,
  ParserScheduleStatus,
  ParserTargetEnv,
  ResourceAvailabilityStatus,
} from '../../domain/types';

@Entity('parser_schedules')
@Index(['parser_code', 'run_type', 'target_env', 'status'])
@Index(['next_run_at'])
@Index(['deleted_at'])
export class ParserSchedule {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'parser_code', type: 'varchar', length: 64 })
  parser_code: string;

  @Column({ name: 'run_type', type: 'varchar', length: 8 })
  run_type: ParserRunType;

  @Column({ type: 'varchar', length: 255 })
  domain: string;

  @Column({ name: 'assigned_user_id', type: 'uuid', nullable: true })
  assigned_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'assigned_user_id' })
  assigned_user: User | null;

  @Column({ name: 'target_env', type: 'varchar', length: 16 })
  target_env: ParserTargetEnv;

  @Column({ name: 'cron_expression', type: 'varchar', length: 128 })
  cron_expression: string;

  @Column({ name: 'frequency_preset', type: 'varchar', length: 64, nullable: true })
  frequency_preset: string | null;

  @Column({ type: 'varchar', length: 64, default: 'Europe/Chisinau' })
  timezone: string;

  @Column({ type: 'varchar', length: 16 })
  status: ParserScheduleStatus;

  @Column({ name: 'config_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" })
  config_snapshot: Record<string, unknown>;

  @Column({ name: 'next_run_at', type: 'timestamptz', nullable: true })
  next_run_at: Date | null;

  @Column({ name: 'last_run_at', type: 'timestamptz', nullable: true })
  last_run_at: Date | null;

  @Column({ name: 'resource_availability_status', type: 'varchar', length: 32, nullable: true })
  resource_availability_status: ResourceAvailabilityStatus | null;

  @Column({ name: 'resource_availability_checked_at', type: 'timestamptz', nullable: true })
  resource_availability_checked_at: Date | null;

  @Column({ name: 'resource_availability_summary', type: 'text', nullable: true })
  resource_availability_summary: string | null;

  @Column({ name: 'resource_availability_scope', type: 'jsonb', nullable: true })
  resource_availability_scope: Record<string, unknown> | null;

  @Column({ name: 'created_by_admin_user_id', type: 'uuid' })
  created_by_admin_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_admin_user_id' })
  created_by_admin: User;

  @Column({ name: 'updated_by_admin_user_id', type: 'uuid', nullable: true })
  updated_by_admin_user_id: string | null;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'updated_by_admin_user_id' })
  updated_by_admin: User | null;

  @Column({ name: 'deleted_at', type: 'timestamptz', nullable: true })
  deleted_at: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
