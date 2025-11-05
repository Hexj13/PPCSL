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

import { Listing } from './listing.entity';

@Entity('listing_views')
@Index(['listing_id', 'user_id'], { unique: true, where: '"user_id" IS NOT NULL' })
@Index(['listing_id', 'visitor_id'], { unique: true, where: '"visitor_id" IS NOT NULL' })
export class ListingView {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  listing_id: string;

  @ManyToOne(() => Listing)
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column('uuid', { nullable: true })
  user_id: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ nullable: true })
  visitor_id: string;

  @CreateDateColumn()
  created_at: Date;
}
