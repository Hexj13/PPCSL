import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import { VehicleModel } from './vehicle-model.entity';

@Entity('brands')
export class Brand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  logoUrl: string;

  @Column({ default: 0 })
  order: number;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => VehicleModel, (model) => model.brand)
  models: VehicleModel[];
}
