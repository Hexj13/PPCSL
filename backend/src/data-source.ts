import { DataSource, DataSourceOptions } from 'typeorm';
import { User } from './users/entities/user.entity';
import { Listing } from './listings/entities/listing.entity';
import { ListingView } from './listings/entities/listing-view.entity';
import { Vehicle } from './listings/entities/vehicle.entity';
import { Favorite } from './favorites/entities/favorite.entity';
import { Brand } from './brands/entities/brand.entity';
import { VehicleModel } from './brands/entities/vehicle-model.entity';

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'kupito',
  password:
    process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? undefined : 'kupito123'),
  database: process.env.DB_NAME || 'kupito',
  entities: [User, Listing, ListingView, Vehicle, Favorite, Brand, VehicleModel],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
  migrations: ['dist/migrations/*.js'],
};

export const AppDataSource = new DataSource(dataSourceOptions);
