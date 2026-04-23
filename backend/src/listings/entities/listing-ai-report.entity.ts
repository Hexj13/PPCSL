import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

import { Listing } from './listing.entity';

@Entity('listing_ai_reports')
@Unique('UQ_listing_ai_reports_listing_lang_hash', ['listing_id', 'report_language', 'input_hash'])
@Index(['listing_id'])
export class ListingAiReport {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  listing_id: string;

  @ManyToOne(() => Listing, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'listing_id' })
  listing: Listing;

  @Column({ type: 'varchar', length: 2 })
  report_language: 'ru' | 'ro';

  @Column({ type: 'varchar', length: 64 })
  input_hash: string;

  @Column({ type: 'jsonb' })
  report: object;

  @CreateDateColumn()
  created_at: Date;
}
