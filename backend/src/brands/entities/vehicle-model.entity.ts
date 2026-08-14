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
@Index(['brand_id', 'is_archived'])
export class VehicleModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  name_normalized: string | null;

  @Column('uuid')
  brand_id: string;

  @ManyToOne(() => Brand, (brand) => brand.models)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column('simple-array', { nullable: true })
  vehicle_types: ('car' | 'truck' | 'moto' | 'tire')[];

  @Column({ default: 0 })
  order: number;

  @Column({ default: false })
  is_archived: boolean;

  @CreateDateColumn()
  created_at: Date;
}
