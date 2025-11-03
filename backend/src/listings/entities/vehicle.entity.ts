import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';
import { FuelType, TransmissionType, BodyType } from '../../common/types';
import * as constants from '../../common/constants';

@Entity('vehicles')
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
    enum: constants.bodyTypes,
  })
  body_type: BodyType;

  @Column({ nullable: true })
  color: string;

  @Column('int', { nullable: true })
  doors: number;
}
