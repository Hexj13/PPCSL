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

@Entity('refresh_tokens')
@Index(['token'], { unique: true })
@Index(['user_id'])
@Index(['expires_at'])
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'text' })
  token: string;

  @Column({ type: 'timestamp' })
  expires_at: Date;

  @Column({ type: 'boolean', default: false })
  revoked: boolean;

  @Column({ type: 'timestamp', nullable: true })
  rotated_at: Date | null;

  @CreateDateColumn()
  created_at: Date;
}
