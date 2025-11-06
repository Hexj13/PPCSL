import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { Brand } from './brand.entity';

@Entity('vehicle_models')
@Index(['brand_id'])
@Index(['order'])
export class VehicleModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('uuid')
  brand_id: string;

  @ManyToOne(() => Brand, (brand) => brand.models)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn()
  created_at: Date;
}
