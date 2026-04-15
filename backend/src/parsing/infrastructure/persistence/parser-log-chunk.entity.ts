import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { ParserRun } from './parser-run.entity';

@Entity('parser_log_chunks')
@Index(['run_id', 'seq'], { unique: true })
export class ParserLogChunk {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'run_id', type: 'uuid' })
  run_id: string;

  @ManyToOne(() => ParserRun, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'run_id' })
  run: ParserRun;

  @Column({ type: 'int' })
  seq: number;

  @Column({ type: 'varchar', length: 16 })
  level: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ name: 'raw_line', type: 'text', nullable: true })
  raw_line: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  created_at: Date;
}
