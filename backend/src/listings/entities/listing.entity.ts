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

  @Column('decimal', { precision: 12, scale: 2 })
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
  description: string;

  @Column('uuid')
  user_id: string;

  @ManyToOne(() => User, (user) => user.listings)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column('uuid', { nullable: true })
  vehicle_id: string;

  @OneToOne(() => Vehicle, { cascade: true })
  @JoinColumn({ name: 'vehicle_id' })
  vehicle: Vehicle;

  @Column('simple-array', { nullable: true })
  images: string[];

  @Column({ type: 'boolean', default: false })
  urgent: boolean;

  @Column({ type: 'boolean', default: false })
  is_new: boolean;

  @Column({ nullable: true, length: 17 })
  vin: string;

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

  @Column({ type: 'boolean', nullable: true })
  is_registered: boolean;

  @Column({ type: 'date', nullable: true })
  registration_expires_at: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated_at: Date;

  @Column({ type: 'integer', default: 0 })
  views: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
