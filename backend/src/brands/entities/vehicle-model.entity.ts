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
@Index(['vehicle_type'])
@Index(['brand_id', 'vehicle_type'])
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

  @Column({
    type: 'enum',
    enum: ['car', 'truck', 'moto'],
    nullable: true,
  })
  vehicle_type: 'car' | 'truck' | 'moto';

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn()
  created_at: Date;
}
