import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

import * as constants from '../../common/constants';
import {
  ConditionType,
  Currency,
  ListingCategory,
  ListingStatus,
  RegistrationType,
} from '../../common/types';
import { Tire } from '../../tires/entities/tire.entity';
import { User } from '../../users/entities/user.entity';

import { Vehicle } from './vehicle.entity';

const ListingStatusActive = 'Active' as const;
const ListingStatusPaused = 'Paused' as const;
const ListingStatusClosed = 'Closed' as const;

@Entity('listings')
@Index(['status'])
@Index(['user_id'])
@Index(['status', 'user_id'])
@Index(['status', 'last_updated_at'])
@Index(['price'])
@Index(['created_at'])
@Index(['views'])
@Index(['category'])
@Index(['category', 'status'])
@Index(['vin'], { where: '"vin" IS NOT NULL' })
@Index(['urgent'], { where: '"urgent" = true' })
@Index(['currency'])
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({
    type: 'enum',
    enum: constants.listingCategories,
    enumName: 'listing_category_enum',
    default: constants.listingCategories[0],
  })
  category: ListingCategory;

  @Column('integer')
  price: number;

  @Column({
    type: 'enum',
    enum: constants.currencies,
    default: constants.currencies[0],
  })
  currency: Currency;

  @Column()
  city: string;

  @Column({ type: 'boolean', default: false })
  negotiable: boolean;

  @Column({ type: 'boolean', default: false })
  available_in_credit: boolean;

  @Column({ type: 'integer', nullable: true })
  down_payment_amount: number | null;

  @Column({
    type: 'enum',
    enum: constants.listingStatuses,
    default: constants.listingStatuses[1],
  })
  status: ListingStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ name: 'description_ro', type: 'text', nullable: true })
  description_ro: string | null;

  @Column({ name: 'description_ru', type: 'text', nullable: true })
  description_ru: string | null;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, (user) => user.listings)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', nullable: true })
  vehicle_id: string | null;

  @OneToOne(() => Vehicle, { cascade: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle | null;

  @Column({ type: 'uuid', nullable: true })
  tire_id: string | null;

  @OneToOne(() => Tire, { cascade: true })
  @JoinColumn({ name: 'tire_id' })
  tire: Tire | null;

  @Column('simple-array', { nullable: true })
  images: string[] | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cover_blur_hash: string | null;

  @Column({ type: 'jsonb', nullable: true })
  image_blur_hashes: (string | null)[] | null;

  @Column({ type: 'boolean', default: false })
  urgent: boolean;

  @Column({ type: 'boolean', default: false })
  is_new: boolean;

  @Column({ type: 'varchar', nullable: true, length: 17 })
  vin: string | null;

  @Column({ name: 'partner_source_code', type: 'varchar', length: 32, nullable: true })
  partner_source_code: string | null;

  @Column({ name: 'partner_listing_external_key', type: 'varchar', length: 64, nullable: true })
  partner_listing_external_key: string | null;

  @Column({ name: 'partner_listing_canonical_url', type: 'text', nullable: true })
  partner_listing_canonical_url: string | null;

  @Column({
    type: 'enum',
    enum: constants.conditionTypes,
    nullable: true,
  })
  condition: ConditionType | null;

  @Column({
    type: 'enum',
    enum: constants.registrationTypes,
    nullable: true,
  })
  registration_type: RegistrationType | null;

  @Column('int', { nullable: true })
  horsepower: number | null;

  @Column({ type: 'integer', nullable: true })
  power_kw: number | null;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated_at: Date;

  @Column({ type: 'timestamp', nullable: true })
  last_edited_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  last_published_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  closed_at: Date | null;

  @Column({ type: 'integer', default: 0 })
  views: number;

  @Column('simple-array', { nullable: true })
  equipment: string[] | null;

  @Column({ type: 'boolean', default: false })
  is_promoted: boolean;

  @Column({ type: 'timestamp', nullable: true })
  promoted_until: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  promoted_started_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  promoted_paused_at: Date | null;

  @Index(['is_promoted'], { where: '"is_promoted" = true' })
  @Index(['promoted_until'], { where: '"promoted_until" IS NOT NULL' })
  @Index(['status', 'is_promoted', 'created_at'], { where: '"status" = \'Active\'' })
  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  isActive(): boolean {
    return this.status === ListingStatusActive;
  }

  isPromoted(): boolean {
    return this.is_promoted === true;
  }

  canBeEdited(): boolean {
    return this.status !== ListingStatusClosed;
  }

  canBePublished(): boolean {
    return this.status !== ListingStatusClosed;
  }

  publish(): void {
    if (this.status === ListingStatusClosed) {
      throw new Error('errors.listingClosedCannotPublish');
    }
    if (this.is_promoted && this.promoted_until && this.promoted_paused_at) {
      const now = new Date();
      const pausedMs = now.getTime() - this.promoted_paused_at.getTime();
      this.promoted_until = new Date(this.promoted_until.getTime() + pausedMs);
      this.promoted_paused_at = null;
    }
    if (this.is_promoted && this.promoted_until && !this.promoted_paused_at) {
      const now = new Date();
      if (this.promoted_until < now) {
        this.is_promoted = false;
        this.promoted_until = null;
        this.promoted_started_at = null;
        this.promoted_paused_at = null;
      }
    }
    this.status = ListingStatusActive as ListingStatus;
    this.last_published_at = new Date();
  }

  pause(): void {
    if (this.is_promoted && this.promoted_until && !this.promoted_paused_at) {
      this.promoted_paused_at = new Date();
    }
    this.status = ListingStatusPaused as ListingStatus;
  }

  close(): void {
    this.status = ListingStatusClosed as ListingStatus;
    this.closed_at = new Date();
    this.is_promoted = false;
    this.promoted_until = null;
    this.promoted_started_at = null;
    this.promoted_paused_at = null;
  }

  startPromotion(days: number | null): void {
    if (this.status !== ListingStatusActive) {
      throw new Error('errors.promotionOnlyActive');
    }
    const now = new Date();
    this.is_promoted = true;
    this.promoted_started_at = now;
    this.promoted_paused_at = null;
    if (days === null || days === undefined) {
      this.promoted_until = null;
    } else {
      const until = new Date(now);
      until.setDate(until.getDate() + days);
      this.promoted_until = until;
    }
  }

  pausePromotion(): void {
    if (this.is_promoted && this.promoted_until && !this.promoted_paused_at) {
      this.promoted_paused_at = new Date();
    }
  }

  resumePromotion(): void {
    if (this.promoted_paused_at && this.promoted_until) {
      const remainingMs = this.promoted_until.getTime() - this.promoted_paused_at.getTime();
      this.promoted_until = new Date(Date.now() + remainingMs);
      this.promoted_paused_at = null;
    }
  }

  stopPromotion(): void {
    this.is_promoted = false;
    this.promoted_until = null;
    this.promoted_started_at = null;
    this.promoted_paused_at = null;
  }
}
