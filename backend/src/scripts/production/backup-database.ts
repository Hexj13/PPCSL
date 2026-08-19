import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config({ path: path.join(__dirname, '../../../.env') });

const execAsync = promisify(exec);

interface BackupOptions {
  outputDir?: string;
  compress?: boolean;
  keepDays?: number;
}

async function backupDatabase(options: BackupOptions = {}) {
  const {
    outputDir = path.join(process.cwd(), 'backups'),
    compress = true,
    keepDays = 30,
  } = options;

  const configService = new ConfigService();
  const dbHost = configService.get('DB_HOST', 'localhost');
  const dbPort = configService.get('DB_PORT', '5432');
  const dbUsername = configService.get('DB_USERNAME', 'ppcsl');
  const dbPassword = configService.get('DB_PASSWORD');
  const dbName = configService.get('DB_NAME', 'ppcsl');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const timestamp =
    new Date().toISOString().replace(/[:.]/g, '-').split('T')[0] +
    '_' +
    new Date().toISOString().replace(/[:.]/g, '-').split('T')[1].split('.')[0];
  const filename = `ppcsl_backup_${timestamp}`;
  const filepath = path.join(outputDir, filename);
  const sqlFile = `${filepath}.sql`;

  console.log(`📦 Starting database backup...`);
  console.log(`   Database: ${dbName}`);
  console.log(`   Host: ${dbHost}:${dbPort}`);

  try {
    const env = { ...process.env };
    if (dbPassword) {
      env.PGPASSWORD = dbPassword;
    }

    let pgDumpCmd: string;
    let finalOutputFile: string;

    if (compress) {
      finalOutputFile = `${filepath}.sql.gz`;
      pgDumpCmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUsername} -d ${dbName} -F c -Z 9 -f ${finalOutputFile}`;
    } else {
      finalOutputFile = sqlFile;
      pgDumpCmd = `pg_dump -h ${dbHost} -p ${dbPort} -U ${dbUsername} -d ${dbName} -F c -f ${finalOutputFile}`;
    }

    console.log(`   Running pg_dump...`);
    await execAsync(pgDumpCmd, { env });

    const stats = fs.statSync(finalOutputFile);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`✅ Backup completed successfully!`);
    console.log(`   File: ${finalOutputFile}`);
    console.log(`   Size: ${sizeMB} MB`);

    if (keepDays > 0) {
      console.log(`🧹 Cleaning up old backups (keeping last ${keepDays} days)...`);
      await cleanupOldBackups(outputDir, keepDays, compress);
    }

    return finalOutputFile;
  } catch (error) {
    console.error('❌ Backup failed:', error);
    if (fs.existsSync(sqlFile)) {
      fs.unlinkSync(sqlFile);
    }
    throw error;
  }
}

async function cleanupOldBackups(
  backupDir: string,
  keepDays: number,
  _compressed: boolean,
): Promise<void> {
  const files = fs.readdirSync(backupDir);
  const now = Date.now();
  const maxAge = keepDays * 24 * 60 * 60 * 1000;

  let deletedCount = 0;
  for (const file of files) {
    const filePath = path.join(backupDir, file);
    const stats = fs.statSync(filePath);
    const age = now - stats.mtimeMs;

    if (age > maxAge && (file.endsWith('.sql') || file.endsWith('.sql.gz'))) {
      fs.unlinkSync(filePath);
      deletedCount++;
      console.log(`   Deleted old backup: ${file}`);
    }
  }

  if (deletedCount > 0) {
    console.log(`   Cleaned up ${deletedCount} old backup(s)`);
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const options: BackupOptions = {};

    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--output-dir' && args[i + 1]) {
        options.outputDir = args[i + 1];
        i++;
      } else if (args[i] === '--no-compress') {
        options.compress = false;
      } else if (args[i] === '--keep-days' && args[i + 1]) {
        options.keepDays = parseInt(args[i + 1], 10);
        i++;
      }
    }

    await backupDatabase(options);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(() => {
    process.exit(1);
  });
}

export { backupDatabase };
