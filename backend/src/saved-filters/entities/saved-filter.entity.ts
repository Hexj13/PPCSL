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

@Entity('saved_filters')
@Index(['user_id'])
@Index(['created_at'])
export class SavedFilter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('varchar', { length: 100 })
  name: string;

  @Column('jsonb')
  filters: Record<string, unknown>;

  @CreateDateColumn()
  created_at: Date;
}
