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
import { ConditionType, Currency, ListingStatus, RegistrationType } from '../../common/types';
import { User } from '../../users/entities/user.entity';

import { Vehicle } from './vehicle.entity';

@Entity('listings')
@Index(['status'])
@Index(['user_id'])
@Index(['status', 'user_id'])
@Index(['status', 'last_updated_at'])
@Index(['price'])
@Index(['created_at'])
@Index(['views'])
@Index(['vin'], { where: '"vin" IS NOT NULL' })
@Index(['urgent'], { where: '"urgent" = true' })
@Index(['currency'])
export class Listing {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

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

  @Column({
    type: 'enum',
    enum: constants.listingStatuses,
    default: constants.listingStatuses[1],
  })
  status: ListingStatus;

  @Column({ type: 'text', nullable: true })
  description: string | null;

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

  @Column('simple-array', { nullable: true })
  images: string[] | null;

  @Column({ type: 'boolean', default: false })
  urgent: boolean;

  @Column({ type: 'boolean', default: false })
  is_new: boolean;

  @Column({ type: 'varchar', nullable: true, length: 17 })
  vin: string | null;

  @Column({
    type: 'enum',
    enum: constants.conditionTypes,
  })
  condition: ConditionType;

  @Column({
    type: 'enum',
    enum: constants.registrationTypes,
  })
  registration_type: RegistrationType;

  @Column('int')
  horsepower: number;

  @Column({ type: 'integer', nullable: true })
  power_kw: number | null;

  @Column({ type: 'boolean', nullable: true })
  is_registered: boolean | null;

  @Column({ type: 'date', nullable: true })
  registration_expires_at: Date | null;

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
}
