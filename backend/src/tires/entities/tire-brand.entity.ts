import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';

import { TireModel } from './tire-model.entity';

@Entity('tire_brands')
@Index(['order'])
@Index(['is_archived'])
@Index(['is_archived', 'name_normalized'])
export class TireBrand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 160, nullable: true })
  name_normalized: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  logoUrl: string | null;

  @Column({ default: 0 })
  order: number;

  @Column({ default: false })
  is_archived: boolean;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => TireModel, (model) => model.brand)
  models: TireModel[];
}
