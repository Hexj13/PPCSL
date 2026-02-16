import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';

@Entity('exchange_rates')
@Unique(['base_currency_code', 'quote_currency_code', 'rate_date'])
@Index(['quote_currency_code', 'rate_date'])
export class ExchangeRate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 3 })
  base_currency_code: string;

  @Column({ type: 'varchar', length: 3 })
  quote_currency_code: string;

  @Column({ type: 'decimal', precision: 18, scale: 8 })
  rate: string;

  @Column({ type: 'date' })
  rate_date: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  source: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
