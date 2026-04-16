import { registerAs } from '@nestjs/config';

export const databaseConfig = registerAs('database', () => ({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME || 'kupito',
  password: process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? '' : 'kupito123'),
  database: process.env.DB_NAME || 'kupito',
  synchronize: process.env.DB_SYNC === 'true' || process.env.NODE_ENV === 'test',
  poolMax: parseInt(process.env.DB_POOL_MAX || '20', 10),
  poolMin: parseInt(process.env.DB_POOL_MIN || '0', 10),
  poolIdleTimeout: parseInt(process.env.DB_POOL_IDLE_TIMEOUT || '30000', 10),
  poolConnectionTimeout: parseInt(process.env.DB_POOL_CONNECTION_TIMEOUT || '10000', 10),
}));

export type DatabaseConfig = ReturnType<typeof databaseConfig>;
