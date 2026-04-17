import type { DataSourceOptions } from 'typeorm';
import { DataSource } from 'typeorm';

import { AdminAuditLog } from './admin/entities/admin-audit-log.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { Brand } from './brands/entities/brand.entity';
import { VehicleModel } from './brands/entities/vehicle-model.entity';
import { ComparisonItem } from './comparison/entities/comparison-item.entity';
import { ExchangeRate } from './exchange-rates/entities/exchange-rate.entity';
import { Favorite } from './favorites/entities/favorite.entity';
import { ListingView } from './listings/entities/listing-view.entity';
import { Listing } from './listings/entities/listing.entity';
import { PromotionHistory } from './listings/entities/promotion-history.entity';
import { Vehicle } from './listings/entities/vehicle.entity';
import { ParserLogChunk } from './parsing/infrastructure/persistence/parser-log-chunk.entity';
import { ParserRun } from './parsing/infrastructure/persistence/parser-run.entity';
import { ParserSchedule } from './parsing/infrastructure/persistence/parser-schedule.entity';
import { SavedFilter } from './saved-filters/entities/saved-filter.entity';
import { TireBrand } from './tires/entities/tire-brand.entity';
import { TireModel } from './tires/entities/tire-model.entity';
import { Tire } from './tires/entities/tire.entity';
import { User } from './users/entities/user.entity';

function resolveTypeOrmQueryLogging(): boolean {
  if (process.env.NODE_ENV !== 'development') {
    return false;
  }
  const raw = String(process.env.KUPITO_TYPEORM_QUERY_LOG ?? 'true')
    .trim()
    .toLowerCase();
  if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'off') {
    return false;
  }
  return true;
}

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'kupito',
  password:
    process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? undefined : 'kupito123'),
  database: process.env.DB_NAME || 'kupito',
  entities: [
    User,
    Listing,
    ListingView,
    Vehicle,
    PromotionHistory,
    Favorite,
    ComparisonItem,
    Brand,
    VehicleModel,
    RefreshToken,
    SavedFilter,
    ExchangeRate,
    AdminAuditLog,
    ParserRun,
    ParserSchedule,
    ParserLogChunk,
    TireBrand,
    TireModel,
    Tire,
  ],
  synchronize: process.env.DB_SYNC === 'true' || process.env.NODE_ENV === 'test',
  logging: resolveTypeOrmQueryLogging(),
  migrations: process.env.NODE_ENV === 'test' ? [] : ['dist/migrations/*.js'],
  extra: {
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '0'),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10000'),
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
