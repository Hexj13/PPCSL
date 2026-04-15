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
  ParserRunStatus,
  ParserRunTriggerMode,
  ParserRunType,
  ParserTargetEnv,
} from '../../domain/types';

import { ParserSchedule } from './parser-schedule.entity';

@Entity('parser_runs')
@Index(['parser_code', 'run_type', 'target_env', 'status'])
@Index(['started_at'])
export class ParserRun {
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

  @Column({ name: 'trigger_mode', type: 'varchar', length: 16 })
  trigger_mode: ParserRunTriggerMode;

  @Column({ name: 'schedule_id', type: 'uuid', nullable: true })
  schedule_id: string | null;

  @ManyToOne(() => ParserSchedule, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'schedule_id' })
  schedule: ParserSchedule | null;

  @Column({ type: 'varchar', length: 32 })
  status: ParserRunStatus;

  @Column({ name: 'config_snapshot', type: 'jsonb', default: () => "'{}'::jsonb" })
  config_snapshot: Record<string, unknown>;

  @Column({ name: 'started_at', type: 'timestamptz', nullable: true })
  started_at: Date | null;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finished_at: Date | null;

  @Column({ name: 'cancel_requested_at', type: 'timestamptz', nullable: true })
  cancel_requested_at: Date | null;

  @Column({ name: 'created_by_admin_user_id', type: 'uuid' })
  created_by_admin_user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'created_by_admin_user_id' })
  created_by_admin: User;

  @Column({ name: 'log_storage_key', type: 'varchar', length: 512, nullable: true })
  log_storage_key: string | null;

  @Column({ name: 'report_storage_key', type: 'varchar', length: 512, nullable: true })
  report_storage_key: string | null;

  @Column({ type: 'jsonb', nullable: true })
  counters: Record<string, unknown> | null;

  @Column({ name: 'source_status_summary', type: 'jsonb', nullable: true })
  source_status_summary: Record<string, unknown> | null;

  @Column({ name: 'error_summary', type: 'text', nullable: true })
  error_summary: string | null;

  @Column({ name: 'process_pid', type: 'int', nullable: true })
  process_pid: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updated_at: Date;
}
