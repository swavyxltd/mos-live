# Quick Owner Account Setup

Your database is connected! The issue is that the tables don't exist yet.

## Fastest Solution: Deploy API Endpoint First

Since the database connection is working, you have two quick options:

### Option 1: Create Tables + Owner Account (One Command)

1. Push the schema to create tables:
   ```bash
   npx prisma db push --skip-generate --accept-data-loss
   ```

2. Then create owner account:
   ```bash
   npm run setup:owner
   ```

### Option 2: Use Vercel Deployment (Recommended)

1. **Commit and push the new API endpoint** (`src/app/api/setup/owner/route.ts`)
2. Wait for Vercel to deploy
3. Call the API endpoint:
   ```bash
   curl -X POST "https://YOUR-VERCEL-URL.vercel.app/api/setup/owner" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer setup-secret-key-change-in-production" \
     -d '{"email": "swavyxltd@gmail.com"}'
   ```

### Option 3: Use Prisma Studio (Visual)

1. Push schema:
   ```bash
   npx prisma db push
   ```
   
2. Open Prisma Studio:
   ```bash
   npm run db:studio
   ```
   
3. Manually create user:
   - Email: `swavyxltd@gmail.com`
   - Name: `swavyxltd` (or your name)
   - `isSuperAdmin`: Check the box (true)

## Login After Setup

- **Email**: `swavyxltd@gmail.com`
- **Password**: `demo123`
- **URL**: `/auth/signin`

---

**Current Status**: Database connected ✅, Tables need to be created ⚠️

