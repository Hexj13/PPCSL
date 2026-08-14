import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { PopularBrandCountry } from '../../common/constants';

import { VehicleModel } from './vehicle-model.entity';

@Entity('brands')
@Index(['is_archived'])
@Index(['is_archived', 'name_normalized'])
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  name_normalized: string | null;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ default: 0 })
  order: number;

  @Column('simple-array', { nullable: true })
  vehicle_types: ('car' | 'truck' | 'moto' | 'tire')[];

  @Column({ type: 'varchar', length: 32, nullable: true })
  popular_country: PopularBrandCountry | null;

  @Column({ default: false })
  is_archived: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => VehicleModel, (model) => model.brand)
  models: VehicleModel[];
}
