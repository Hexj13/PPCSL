import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

import * as constants from '../../common/constants';
import { TireCondition, TireSeason, TireVehicleType } from '../../common/types';

import { TireBrand } from './tire-brand.entity';
import { TireModel } from './tire-model.entity';

@Entity('tires')
@Index(['brand_id'])
@Index(['model_id'])
@Index(['tire_vehicle_type'])
@Index(['season'])
@Index(['condition'])
@Index(['quantity'])
@Index(['tire_vehicle_type', 'width_mm', 'aspect_ratio', 'diameter_inch', 'season'])
export class Tire {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  brand_id: string;

  @ManyToOne(() => TireBrand)
  @JoinColumn({ name: 'brand_id' })
  brand: TireBrand;

  @Column('uuid', { nullable: true })
  model_id: string | null;

  @ManyToOne(() => TireModel, { nullable: true })
  @JoinColumn({ name: 'model_id' })
  model: TireModel | null;

  @Column({
    type: 'enum',
    enum: constants.tireVehicleTypes,
    enumName: 'tire_vehicle_type_enum',
  })
  tire_vehicle_type: TireVehicleType;

  @Column({
    type: 'enum',
    enum: constants.tireSeasons,
    enumName: 'tire_season_enum',
  })
  season: TireSeason;

  @Column({
    type: 'enum',
    enum: constants.tireConditions,
    enumName: 'tire_condition_enum',
  })
  condition: TireCondition;

  @Column('int')
  width_mm: number;

  @Column('int')
  aspect_ratio: number;

  @Column('decimal', { precision: 4, scale: 1 })
  diameter_inch: number;

  @Column('smallint')
  quantity: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  load_index: string | null;

  @Column({ type: 'varchar', length: 5, nullable: true })
  speed_index: string | null;

  @Column('int', { nullable: true })
  dot_year: number | null;

  @Column('decimal', { precision: 3, scale: 1, nullable: true })
  tread_depth_mm: number | null;

  @Column({ type: 'boolean', nullable: true })
  studded: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  run_flat: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  reinforced_xl: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  spare_donut: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  tubeless: boolean | null;

  @Column({ type: 'boolean', nullable: true })
  acoustic: boolean | null;
}
