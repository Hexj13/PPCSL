import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TireBrand } from './tire-brand.entity';

@Entity('tire_models')
@Index(['brand_id'])
@Index(['brand_id', 'is_archived'])
@Index(['is_other'])
export class TireModel {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  brand_id: string;

  @ManyToOne(() => TireBrand, (brand) => brand.models)
  @JoinColumn({ name: 'brand_id' })
  brand: TireBrand;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  name_normalized: string | null;

  @Column({ default: 0 })
  order: number;

  @Column({ default: false })
  is_archived: boolean;

  @Column({ default: false })
  is_other: boolean;

  @CreateDateColumn()
  created_at: Date;
}
