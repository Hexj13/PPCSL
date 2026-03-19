import { DataSource } from 'typeorm';

import { dataSourceOptions } from './data-source';

export default new DataSource({
  ...dataSourceOptions,
  migrations: ['src/migrations/*.ts'],
});
