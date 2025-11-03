import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Brand } from '../../brands/entities/brand.entity';
import { VehicleModel } from '../../brands/entities/vehicle-model.entity';

export enum FuelType {
  Petrol = 'Petrol',
  Diesel = 'Diesel',
  Electric = 'Electric',
  Hybrid = 'Hybrid',
  LPG = 'LPG',
}

export enum TransmissionType {
  Manual = 'Manual',
  Automatic = 'Automatic',
  CVT = 'CVT',
}

export enum BodyType {
  Sedan = 'Sedan',
  Hatchback = 'Hatchback',
  Wagon = 'Wagon',
  SUV = 'SUV',
  Coupe = 'Coupe',
  Convertible = 'Convertible',
  Van = 'Van',
  Pickup = 'Pickup',
  Minivan = 'Minivan',
}

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
    enum: FuelType,
    nullable: true,
  })
  fuel: FuelType;

  @Column({
    type: 'enum',
    enum: TransmissionType,
    nullable: true,
  })
  transmission: TransmissionType;

  @Column({
    type: 'enum',
    enum: BodyType,
  })
  body_type: BodyType;

  @Column({ nullable: true })
  color: string;

  @Column('int', { nullable: true })
  doors: number;
}
