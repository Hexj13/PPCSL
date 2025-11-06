import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import * as constants from '../../common/constants';
import { BodyType, DriveType, FuelType, TransmissionType } from '../../common/types';

@Entity('vehicles')
@Index(['brand_id'])
@Index(['model_id'])
@Index(['brand_id', 'model_id'])
@Index(['year'])
@Index(['fuel'], { where: '"fuel" IS NOT NULL' })
@Index(['transmission'], { where: '"transmission" IS NOT NULL' })
@Index(['body_type'])
@Index(['mileage_km'], { where: '"mileage_km" IS NOT NULL' })
@Index(['engine_displ_l'], { where: '"engine_displ_l" IS NOT NULL' })
export class Vehicle {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  brand_id: string;

  @ManyToOne(() => Brand)
  @JoinColumn({ name: 'brand_id' })
  brand: Brand;

  @Column('uuid')
  model_id: string;

  @ManyToOne(() => VehicleModel)
  @JoinColumn({ name: 'model_id' })
  model: VehicleModel;

  @Column('int')
  year: number;

  @Column('decimal', { precision: 4, scale: 2, nullable: true })
  engine_displ_l: number;

  @Column('int', { nullable: true })
  mileage_km: number;

  @Column({
    type: 'enum',
    enum: constants.fuelTypes,
    nullable: true,
  })
  fuel: FuelType;

  @Column({
    type: 'enum',
    enum: constants.transmissionTypes,
    nullable: true,
  })
  transmission: TransmissionType;

  @Column({
    type: 'enum',
    enum: constants.driveTypes,
  })
  drive_type: DriveType;

  @Column({
    type: 'enum',
    enum: constants.bodyTypes,
  })
  body_type: BodyType;

  @Column({ nullable: true })
  color: string;

  @Column('int', { nullable: true })
  doors: number;
}
