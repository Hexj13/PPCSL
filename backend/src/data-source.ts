import { DataSource, DataSourceOptions } from 'typeorm';

import { RefreshToken } from './auth/entities/refresh-token.entity';
import { Brand } from './brands/entities/brand.entity';
import { VehicleModel } from './brands/entities/vehicle-model.entity';
import { Favorite } from './favorites/entities/favorite.entity';
import { ListingView } from './listings/entities/listing-view.entity';
import { Listing } from './listings/entities/listing.entity';
import { PromotionHistory } from './listings/entities/promotion-history.entity';
import { Vehicle } from './listings/entities/vehicle.entity';
import { SavedFilter } from './saved-filters/entities/saved-filter.entity';
import { User } from './users/entities/user.entity';

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
    Brand,
    VehicleModel,
    RefreshToken,
    SavedFilter,
  ],
  synchronize: process.env.DB_SYNC === 'true' || process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  migrations: ['dist/migrations/*.js'],
  extra: {
    max: parseInt(process.env.DB_POOL_MAX || '20'),
    min: parseInt(process.env.DB_POOL_MIN || '5'),
    idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000'),
    connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '2000'),
  },
};

export const AppDataSource = new DataSource(dataSourceOptions);
