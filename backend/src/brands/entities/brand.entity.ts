import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { VehicleModel } from './vehicle-model.entity';

@Entity('brands')
@Index(['order'])
@Index(['vehicle_types'])
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ default: 0 })
  order: number;

  @Column('simple-array', { nullable: true })
  vehicle_types: ('car' | 'truck' | 'moto')[];

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => VehicleModel, (model) => model.brand)
  models: VehicleModel[];
}
