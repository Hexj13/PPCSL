# Database Backups

This document describes how to set up automated database backups for the Kupito application.

## Overview

Database backups are critical for production environments. This guide provides two methods for backing up your PostgreSQL database:

1. **TypeScript Script** - Can be run manually or via cron
2. **Bash Script** - Recommended for cron automation

## Prerequisites

- PostgreSQL client tools (`pg_dump`) installed on the server
- Access to database credentials (via environment variables or `.env` file)
- Sufficient disk space for backups (recommend at least 10x database size)

## Backup Methods

### Method 1: TypeScript Script (Recommended for Development)

The TypeScript script uses Node.js and reads configuration from environment variables or `.env` file.

#### Usage

```bash
# Basic backup (uses defaults from .env)
npm run backup

# Custom output directory
npm run backup -- --output-dir /path/to/backups

# Without compression
npm run backup -- --no-compress

# Keep backups for 60 days (default: 30)
npm run backup -- --keep-days 60
```

#### Configuration

The script reads from environment variables:
- `DB_HOST` (default: localhost)
- `DB_PORT` (default: 5432)
- `DB_USERNAME` (default: kupito)
- `DB_PASSWORD` (required)
- `DB_NAME` (default: kupito)

Or from `.env` file in the `backend/` directory.

#### Output

Backups are saved to `backend/backups/` by default with format:
```
kupito_backup_YYYY-MM-DD_HH-MM-SS.sql.gz
```

### Method 2: Bash Script (Recommended for Production/Cron)

The bash script is more efficient and better suited for automated cron jobs.

#### Usage

```bash
# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_USERNAME=kupito
export DB_PASSWORD=your_password
export DB_NAME=kupito
export BACKUP_DIR=/var/backups/kupito
export KEEP_DAYS=30

# Run backup
./backend/scripts/backup-database.sh
```

Or with inline variables:

```bash
DB_PASSWORD=your_password BACKUP_DIR=/var/backups/kupito ./backend/scripts/backup-database.sh
```

## Setting Up Automated Backups (Cron)

### Step 1: Create Backup Directory

```bash
sudo mkdir -p /var/backups/kupito
sudo chown $USER:$USER /var/backups/kupito
```

### Step 2: Create Environment File for Cron

Create a file with database credentials (restrict permissions):

```bash
sudo nano /etc/kupito/backup.env
```

Add:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=kupito
DB_PASSWORD=your_secure_password
DB_NAME=kupito
BACKUP_DIR=/var/backups/kupito
KEEP_DAYS=30
```

Set permissions:
```bash
sudo chmod 600 /etc/kupito/backup.env
sudo chown $USER:$USER /etc/kupito/backup.env
```

### Step 3: Create Cron Job

Edit crontab:
```bash
crontab -e
```

Add one of these entries:

**Option A: Daily backup at 2 AM**
```cron
0 2 * * * source /etc/kupito/backup.env && /path/to/kupito/backend/scripts/backup-database.sh >> /var/log/kupito-backup.log 2>&1
```

**Option B: Backup every 6 hours**
```cron
0 */6 * * * source /etc/kupito/backup.env && /path/to/kupito/backend/scripts/backup-database.sh >> /var/log/kupito-backup.log 2>&1
```

**Option C: Using TypeScript script**
```cron
0 2 * * * cd /path/to/kupito/backend && source /etc/kupito/backup.env && npm run backup >> /var/log/kupito-backup.log 2>&1
```

### Step 4: Test the Cron Job

Test manually first:
```bash
source /etc/kupito/backup.env
/path/to/kupito/backend/scripts/backup-database.sh
```

Verify backup was created:
```bash
ls -lh /var/backups/kupito/
```

## Backup Retention

By default, backups older than 30 days are automatically deleted. You can configure this:

- **TypeScript script**: `--keep-days 60`
- **Bash script**: `KEEP_DAYS=60`

## Restoring from Backup

### Restore from Compressed Backup

```bash
# Extract if needed
gunzip kupito_backup_2024-01-01_12-00-00.sql.gz

# Restore
pg_restore -h localhost -p 5432 -U kupito -d kupito -c kupito_backup_2024-01-01_12-00-00.sql
```

### Restore from SQL Dump (if using --no-compress)

```bash
psql -h localhost -p 5432 -U kupito -d kupito < kupito_backup_2024-01-01_12-00-00.sql
```

**⚠️ Warning**: Restoring will drop existing data. Always backup current database before restoring!

## Backup Storage Recommendations

### Local Storage
- Store backups on separate disk/partition
- Monitor disk space
- Consider RAID for redundancy

### Remote Storage (Recommended for Production)
- **S3-compatible storage**: Use `aws s3 cp` or `rclone` to sync backups
- **SFTP/SCP**: Copy backups to remote server
- **Cloud storage**: Google Drive, Dropbox, etc.

### Example: Sync to S3

Add to backup script:
```bash
# After backup completes
aws s3 cp "$FILEPATH" s3://your-bucket/kupito-backups/ --storage-class STANDARD_IA
```

Or add to cron:
```cron
0 2 * * * source /etc/kupito/backup.env && /path/to/kupito/backend/scripts/backup-database.sh && aws s3 cp "$BACKUP_DIR/kupito_backup_*.sql.gz" s3://your-bucket/kupito-backups/ --storage-class STANDARD_IA
```

## Monitoring

### Check Backup Logs

```bash
tail -f /var/log/kupito-backup.log
```

### Verify Recent Backups

```bash
ls -lht /var/backups/kupito/ | head -10
```

### Alert on Backup Failures

Add email notification to cron:
```cron
0 2 * * * source /etc/kupito/backup.env && /path/to/kupito/backend/scripts/backup-database.sh || echo "Backup failed!" | mail -s "Kupito Backup Failed" admin@example.com
```

## Troubleshooting

### Permission Denied
```bash
chmod +x /path/to/kupito/backend/scripts/backup-database.sh
```

### pg_dump: command not found
Install PostgreSQL client:
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql
```

### Database Connection Failed
- Verify database credentials in environment file
- Check database is running: `pg_isready -h localhost -p 5432`
- Verify network connectivity

### Disk Space Issues
- Monitor disk usage: `df -h`
- Reduce `KEEP_DAYS` to keep fewer backups
- Move backups to remote storage

## Best Practices

1. **Test restores regularly** - Verify backups are working by testing restore process
2. **Store backups off-site** - Don't rely only on local backups
3. **Encrypt sensitive backups** - Use encryption for backups containing sensitive data
4. **Monitor backup size** - Large backups may indicate issues
5. **Document restore procedure** - Keep restore steps documented and tested
6. **Automate everything** - Use cron for consistency
7. **Set up alerts** - Get notified if backups fail

## Backup Schedule Recommendations

- **Development**: Daily backups, keep 7 days
- **Staging**: Daily backups, keep 14 days
- **Production**: 
  - Daily backups, keep 30 days
  - Weekly backups, keep 12 weeks
  - Monthly backups, keep 12 months

## Security Notes

- Never commit backup files or credentials to git
- Restrict file permissions: `chmod 600 backup.env`
- Use strong database passwords
- Consider encrypting backup files for sensitive data
- Rotate backup storage credentials regularly

