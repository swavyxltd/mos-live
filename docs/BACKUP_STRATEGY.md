# Database Backup Strategy

## Overview

This document outlines the backup and disaster recovery strategy for Madrasah OS.

## Automated Backups

### Vercel Postgres

If using Vercel Postgres, backups are automatically configured:

- **Automatic Backups**: Daily backups are created automatically
- **Retention**: Backups are retained for 7 days by default (can be extended)
- **Point-in-Time Recovery**: Available for Vercel Postgres Pro plans

### Manual Backup Script

Create a backup script for manual backups:

```bash
#!/bin/bash
# backup-database.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Using pg_dump
pg_dump $DATABASE_URL > "$BACKUP_DIR/backup_$DATE.sql"

# Or using Prisma
npx prisma db execute --stdin < "$BACKUP_DIR/backup_$DATE.sql"

echo "Backup created: $BACKUP_DIR/backup_$DATE.sql"
```

## Backup Restoration

### From Vercel Postgres Backup

1. Go to Vercel Dashboard → Storage → Your Database
2. Click on "Backups" tab
3. Select the backup to restore
4. Click "Restore" (creates a new database)
5. Update `DATABASE_URL` to point to restored database

### From SQL Dump

```bash
# Restore from SQL file
psql $DATABASE_URL < backup_20241125_120000.sql

# Or using Prisma
npx prisma db execute --stdin < backup_20241125_120000.sql
```

## Disaster Recovery Procedure

### 1. Database Failure

1. **Identify the issue**: Check error logs and database status
2. **Stop writes**: Temporarily disable write operations if possible
3. **Restore from backup**: Use most recent backup
4. **Verify data integrity**: Run data validation queries
5. **Resume operations**: Re-enable write operations

### 2. Data Corruption

1. **Stop all operations immediately**
2. **Identify corruption scope**: Determine affected tables/records
3. **Restore from backup**: Use backup from before corruption
4. **Replay transactions**: If using transaction logs, replay from backup point
5. **Verify and resume**: Validate data and resume operations

### 3. Complete System Failure

1. **Assess damage**: Determine what needs to be restored
2. **Restore database**: From most recent backup
3. **Redeploy application**: Deploy from git repository
4. **Verify environment variables**: Ensure all are set correctly
5. **Run migrations**: `npx prisma migrate deploy`
6. **Test critical functions**: Verify payment processing, authentication, etc.

## Backup Testing Schedule

- **Weekly**: Test backup restoration on staging environment
- **Monthly**: Full disaster recovery drill
- **Quarterly**: Review and update backup strategy

## Backup Retention Policy

- **Daily backups**: Retain for 30 days
- **Weekly backups**: Retain for 12 weeks
- **Monthly backups**: Retain for 12 months

## Monitoring

Set up alerts for:
- Backup failures
- Backup size anomalies
- Database connection issues
- Disk space warnings

## Best Practices

1. **Test backups regularly**: Don't wait for disaster to test restoration
2. **Document procedures**: Keep this document updated
3. **Automate where possible**: Use cron jobs for regular backups
4. **Store backups off-site**: Don't rely on single location
5. **Encrypt backups**: Protect sensitive data
6. **Version control**: Keep backup scripts in git

## Emergency Contacts

- **Database Admin**: [Your contact]
- **DevOps Team**: [Your contact]
- **Vercel Support**: support@vercel.com

---

**Last Updated**: 2025-11-25
**Next Review**: 2026-02-25

