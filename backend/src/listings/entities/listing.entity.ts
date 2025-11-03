import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vehicle } from './vehicle.entity';
import { ListingStatus, Currency } from '../../common/types';
import * as constants from '../../common/constants';

@Entity('listings')
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

  @Column({ nullable: true, length: 17 })
  vin: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  last_updated_at: Date;

  @Column({ type: 'integer', default: 0 })
  views: number;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
