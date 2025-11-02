# Owner Account Setup Guide

## Problem
You need to login as an owner to add organizations and other account types, but authentication is failing.

## Solution: Create Owner Account in Database

### Step 1: Create Owner Account

You have several options:

#### Option A: Use API Endpoint (Recommended - Works from anywhere)

This method works even if your local machine can't connect to the database directly:

```bash
npm run setup:owner:api
```

Or manually:

```bash
curl -X POST "https://your-vercel-url.com/api/setup/owner" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer setup-secret-key-change-in-production" \
  -d '{"email": "swavyxltd@gmail.com"}'
```

**Important:** For security, set `SETUP_SECRET` in Vercel environment variables and use that instead of the default secret.

#### Option B: Use the setup script locally

Run this command locally (make sure your `.env` has `DATABASE_URL` set):

```bash
npm run setup:owner
```

This creates/updates an owner account with email: `swavyxltd@gmail.com`

**Note:** This connects to your Neon database via Vercel Postgres.

#### Option C: Use production setup script

For Vercel/production environment:

```bash
npm run setup:owner:prod
```

This uses the `DATABASE_URL` from your environment variables.

#### Option D: Manually via Prisma Studio

1. Run `npm run db:studio`
2. Navigate to the `User` table
3. Create a new user with:
   - Email: your email (e.g., `swavyxltd@gmail.com` or `owner@demo.com`)
   - Name: Your name
   - `isSuperAdmin`: `true`
   - Save the record

### Step 2: Login Credentials

Once the owner account is created, use these credentials:

- **Email**: The email you used when creating the account
  - Default: `swavyxltd@gmail.com` (from setup-owner.ts)
  - Or: `owner@demo.com` (if you seeded the database)
- **Password**: `demo123` (hardcoded for now)

### Step 3: Verify in Vercel

1. Make sure `DATABASE_URL` is set in Vercel environment variables
2. Make sure `NEXTAUTH_SECRET` is set in Vercel
3. Make sure `NEXTAUTH_URL` matches your deployment URL
4. Redeploy if you just created the account

### Step 4: Test Login

1. Go to: `https://your-vercel-url.com/auth/signin`
2. Enter your owner email
3. Enter password: `demo123`
4. Click "Sign in"

## Troubleshooting

### "Invalid email or password"
- Verify the user exists in the database
- Check that `isSuperAdmin` is set to `true` in the database
- Verify you're using password: `demo123` (exactly, case-sensitive)
- Check Vercel function logs for authentication errors

### "User not found"
- Run the setup script to create the owner account
- Verify `DATABASE_URL` is correct in Vercel
- Check that Prisma can connect to your database

### Database Connection Errors
- Verify `DATABASE_URL` is set correctly in Vercel
- Check that your database allows connections from Vercel IPs
- Check Vercel function logs for connection errors
- The app will fall back to demo mode if database connection fails

## After Successful Login

Once you're logged in as owner:
1. Navigate to `/owner/overview`
2. You can now create organizations
3. You can add other account types (admin, staff, parent)

## Quick Commands

```bash
# Create owner account via API (works from anywhere)
npm run setup:owner:api

# Create owner account locally (requires database access)
npm run setup:owner

# Create owner account with production DATABASE_URL
npm run setup:owner:prod

# Seed database with demo users (includes owner@demo.com)
npm run db:seed

# Open Prisma Studio to manually check/create users
npm run db:studio
```

