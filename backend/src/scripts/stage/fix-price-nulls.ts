import { DataSource } from 'typeorm';

async function fixPriceNulls() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'kupito',
    password:
      process.env.DB_PASSWORD || (process.env.NODE_ENV === 'production' ? undefined : 'kupito123'),
    database: process.env.DB_NAME || 'kupito',
    synchronize: false,
  });

  try {
    console.log('🔌 Connecting to database...');
    await dataSource.initialize();
    console.log('✅ Connected to database');

    console.log('🔧 Fixing NULL values in price column...');

    await dataSource.query(`
      UPDATE "listings" 
      SET "price" = 0 
      WHERE "price" IS NULL
    `);

    console.log(`✅ Updated rows with NULL price values`);

    console.log('🔧 Converting price column from decimal to integer...');

    await dataSource.query(`
      ALTER TABLE "listings" 
      ALTER COLUMN "price" TYPE integer 
      USING ROUND("price")::integer,
      ALTER COLUMN "price" SET NOT NULL
    `);

    console.log('✅ Price column successfully converted to integer');

    await dataSource.destroy();
    console.log('🎉 Done!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  }
}

if (require.main === module) {
  fixPriceNulls()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { fixPriceNulls };
