# Helper Scripts Reference

This document lists all helper scripts available in the `scripts/` directory and how to use them.

## Pre-Deployment Scripts

### `validate-env.ts`
Validates all required environment variables before deployment.

**Usage:**
```bash
npm run validate-env
```

---

### `test-stripe-config.ts`
Tests Stripe API connectivity and configuration.

**Usage:**
```bash
npm run test-stripe
```

**What it checks:**
- Stripe API keys are set and valid
- Price ID exists
- Webhook secret is configured
- API connection works
- Webhook endpoints are configured

---

### `test-resend-config.ts`
Tests Resend email API configuration.

**Usage:**
```bash
npm run test-resend
```

**What it checks:**
- Resend API key is set
- From email is configured
- Email format is valid
- API client initializes correctly

---

### `verify-deployment.ts`
Verifies that deployment is successful and all services are working.

**Usage:**
```bash
PRODUCTION_URL=https://your-app.vercel.app npm run verify-deployment
# Or set PRODUCTION_URL in .env
```

**What it checks:**
- Health check endpoint responds
- Homepage loads
- SSL/HTTPS is enabled
- API routes work
- Response times are acceptable

---

### `load-test.ts`
Simple load testing script for API endpoints.

**Usage:**
```bash
npm run load-test [url] [concurrent] [duration]
# Example: npm run load-test https://app.madrasah.io 10 30
```

**What it tests:**
- Health check endpoint
- Dashboard stats endpoint
- Response times (avg, p50, p95, p99)
- Success rates
- Error rates

See [Load Testing Guide](LOAD_TESTING.md) for comprehensive load testing strategies.

---

### `migrate-production.ts`
Interactive helper for safely running migrations on production.

**Usage:**
```bash
npm run migrate:prod
```

**What it does:**
- Checks environment (production mode)
- Verifies database URL
- Checks SSL configuration
- Shows pre-migration checklist
- Runs migration status check
- Deploys migrations with confirmation

**Safety features:**
- Requires confirmation at each step
- Checks for production database
- Verifies SSL is enabled
- Shows migration status before deploying

---

## Pre-Deployment Scripts (continued)

**What it checks:**
- All required environment variables are set
- Stripe keys are in correct format (starts with `sk_live_` or `pk_live_`)
- Database URL includes SSL mode
- NEXTAUTH_SECRET is long enough (32+ characters)
- Optional variables are noted

**Exit codes:**
- `0`: All variables valid
- `1`: Missing required variables or validation failed

---

### `test-db-connection.ts`
Tests database connectivity and verifies schema.

**Usage:**
```bash
npm run test-db
```

**What it checks:**
- Database connection
- Basic query execution
- Critical tables exist (User, Organization, Student, Class, Invoice)
- Multi-tenant query capability
- SSL connection status (if supported)

**Exit codes:**
- `0`: All tests passed
- `1`: Connection failed or tables missing

---

## Database Management Scripts

### `add-owner.ts`
Creates an owner account for the platform.

**Usage:**
```bash
npm run add:owner
# Or directly:
tsx scripts/add-owner.ts
```

---

### `list-accounts.ts`
Lists all user accounts in the database.

**Usage:**
```bash
npm run list:accounts
```

---

### `set-password.ts`
Sets or resets a user's password.

**Usage:**
```bash
tsx scripts/set-password.ts <email> <new-password>
```

---

### `audit-passwords.ts`
Audits password security (checks for weak passwords, etc.).

**Usage:**
```bash
npm run audit:passwords
```

---

### `disable-2fa.ts`
Disables 2FA for a user account.

**Usage:**
```bash
tsx scripts/disable-2fa.ts <email>
```

---

## Demo Data Scripts

### `create-test-accounts.ts`
Creates test accounts for development.

**Usage:**
```bash
npm run create:accounts
```

---

### `add-demo-data-for-test-accounts.ts`
Adds demo data (students, classes, invoices) for test accounts.

**Usage:**
```bash
npm run add:demo-data
```

---

### `add-gift-aid-demo-data.ts`
Adds gift aid demo data.

**Usage:**
```bash
npm run add:gift-aid-demo
```

---

### `setup-all-demo-data.ts`
Sets up all demo data at once.

**Usage:**
```bash
npm run setup:all-demo
```

---

### `remove-demo-data.ts`
Removes demo data from the database.

**Usage:**
```bash
tsx scripts/remove-demo-data.ts
```

---

### `reset-demo-data.ts`
Resets all demo data (removes and recreates).

**Usage:**
```bash
tsx scripts/reset-demo-data.ts
```

---

## Payment Scripts

### `add-demo-payments.ts`
Creates demo payment records.

**Usage:**
```bash
tsx scripts/add-demo-payments.ts
```

---

### `create-payments-for-yes-parents.ts`
Creates payments for parents who have gift aid set to "YES".

**Usage:**
```bash
tsx scripts/create-payments-for-yes-parents.ts
```

---

### `create-real-payments.ts`
Creates real payment records (use with caution).

**Usage:**
```bash
tsx scripts/create-real-payments.ts
```

---

### `remove-payments-demo-data.ts`
Removes demo payment data.

**Usage:**
```bash
tsx scripts/remove-payments-demo-data.ts
```

---

## Organization Management

### `reactivate-org.ts`
Reactivates a deactivated organization.

**Usage:**
```bash
tsx scripts/reactivate-org.ts <org-slug>
```

---

## Schedule Management

### `update-class-schedules.ts`
Updates class schedules in bulk.

**Usage:**
```bash
tsx scripts/update-class-schedules.ts
```

---

### `update-attendance-schedule.ts`
Updates attendance schedules.

**Usage:**
```bash
tsx scripts/update-attendance-schedule.ts
```

---

## Migration Scripts

### `apply-event-migration.sql`
SQL migration for events table.

**Usage:**
```bash
# Apply via Prisma
npx prisma db execute --stdin < scripts/apply-event-migration.sql
```

---

## Integration Scripts

### `import-vercel.ts`
Imports data from Vercel.

**Usage:**
```bash
npm run import:vercel
```

---

### `add-vercel-stripe-env.sh`
Shell script to add Vercel Stripe environment variables.

**Usage:**
```bash
bash scripts/add-vercel-stripe-env.sh
```

---

## Permissions

### `seed-permissions.ts`
Seeds staff permissions.

**Usage:**
```bash
tsx scripts/seed-permissions.ts
```

---

## Best Practices

1. **Always backup before running scripts that modify data**
2. **Test scripts in development first**
3. **Use `validate-env` before deploying**
4. **Use `test-db` to verify database connectivity**
5. **Review script source code before running**

---

**Last Updated**: 2025-11-25

