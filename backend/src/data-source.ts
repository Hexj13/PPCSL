import type { DataSourceOptions, LoggerOptions } from 'typeorm';
import { DataSource } from 'typeorm';

import { AdminAuditLog } from './admin/entities/admin-audit-log.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { Brand } from './brands/entities/brand.entity';
import { VehicleModel } from './brands/entities/vehicle-model.entity';
import { loadBackendEnvFile } from './common/config/load-backend-env';
import { TypeormSlowQueryLogger } from './common/typeorm-slow-query.logger';
import { ComparisonItem } from './comparison/entities/comparison-item.entity';
import { ExchangeRate } from './exchange-rates/entities/exchange-rate.entity';
import { Favorite } from './favorites/entities/favorite.entity';
import { ListingAiReport } from './listings/entities/listing-ai-report.entity';
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

loadBackendEnvFile();

function resolvePostgresSsl(): boolean | { rejectUnauthorized: false } {
  const raw = process.env.DB_SSL?.trim().toLowerCase();
  if (raw === 'true' || raw === '1' || raw === 'yes') {
    return { rejectUnauthorized: false };
  }
  if (raw === 'false' || raw === '0' || raw === 'no') {
    return false;
  }
  return process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false;
}

function resolveTypeOrmLogging(): LoggerOptions {
  if (process.env.NODE_ENV === 'production') {
    return ['warn', 'error'];
  }
  const raw = String(
    process.env.PPCSL_TYPEORM_QUERY_LOG ?? process.env.KUPITO_TYPEORM_QUERY_LOG ?? '',
  )
    .trim()
    .toLowerCase();
  const queryLogOn = raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
  if (queryLogOn) {
    return true;
  }
  // Default off: `logging: true` dumps every SQL line (cron, health, TypeORM bootstrap).
  if (process.env.NODE_ENV === 'development') {
    return ['warn', 'error'];
  }
  return ['error'];
}

function resolveSlowQueryMs(): number {
  const parsed = parseInt(process.env.DB_SLOW_QUERY_MS || '500', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 500;
}

const typeOrmLogging = resolveTypeOrmLogging();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'ppcsl',
  password:
    process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? undefined : 'ppcsl123'),
  database: process.env.DB_NAME || 'ppcsl',
  entities: [
    User,
    Listing,
    ListingAiReport,
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
  ssl: resolvePostgresSsl(),
  synchronize: process.env.DB_SYNC === 'true' || process.env.NODE_ENV === 'test',
  logging: typeOrmLogging,
  logger: new TypeormSlowQueryLogger(typeOrmLogging),
  maxQueryExecutionTime: resolveSlowQueryMs(),
  migrations: process.env.NODE_ENV === 'test' ? [] : ['dist/migrations/*.js'],
  extra: {
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '0'),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10000'),
    statement_timeout: parseInt(process.env.DB_STATEMENT_TIMEOUT_MS || '30000'),
    idle_in_transaction_session_timeout: parseInt(
      process.env.DB_IDLE_IN_TRANSACTION_TIMEOUT_MS || '30000',
      10,
    ),
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
export default AppDataSource;
