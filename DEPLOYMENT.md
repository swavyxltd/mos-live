# Vercel Deployment Guide

This guide will help you deploy Madrasah OS to Vercel.

## Prerequisites

- A Vercel account ([vercel.com](https://vercel.com))
- A PostgreSQL database (recommended: [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) or [Neon](https://neon.tech))
- A Stripe account for payments
- A Resend account for emails
- Meta/WhatsApp Business API credentials (optional)

## Step 1: Push Code to GitHub

First, commit and push your changes:

```bash
git commit -m "Remove Google sign-in and prepare for deployment"
git push origin main
```

## Step 2: Import Project to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. Vercel will auto-detect it's a Next.js project

## Step 3: Configure Environment Variables

In the Vercel project settings, add these environment variables:

### Core Configuration
```
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=[Generate a random secret, e.g., openssl rand -base64 32]
APP_BASE_URL=https://your-app.vercel.app
```

### Database
```
POSTGRES_PRISMA_URL=[Your PostgreSQL connection string]
```
**Note:** If using Vercel Postgres, use the `POSTGRES_PRISMA_URL` from the Vercel dashboard.

### Stripe
```
STRIPE_SECRET_KEY=[Your Stripe secret key]
STRIPE_PRICE_ID=[Your Stripe price ID for subscriptions]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[Your Stripe publishable key]
STRIPE_WEBHOOK_SECRET=[Your Stripe webhook secret]
```

### Vercel Blob Storage
```
BLOB_READ_WRITE_TOKEN=[Auto-setup when you add Blob Storage in Vercel]
```

### Email (Resend)
```
RESEND_API_KEY=[Your Resend API key]
RESEND_FROM=Madrasah OS <noreply@madrasah.io>
```

### WhatsApp/Meta (Optional)
```
META_APP_ID=[Your Meta App ID]
META_APP_SECRET=[Your Meta App Secret]
META_GRAPH_VERSION=v18.0
META_GRAPH_BASE=https://graph.facebook.com
WHATSAPP_EMBEDDED_REDIRECT_URL=https://your-app.vercel.app/integrations/whatsapp/callback
WHATSAPP_VERIFY_TOKEN=[Generate a random token]
```

### Optional (for development/testing)
```
WHATSAPP_DEV_ACCESS_TOKEN=[Optional]
WHATSAPP_DEV_PHONE_NUMBER_ID=[Optional]
WHATSAPP_DEV_WABA_ID=[Optional]
```

## Step 4: Set Up Vercel Postgres (Recommended)

1. In your Vercel project dashboard, go to **Storage**
2. Click **"Create Database"** → **"Postgres"**
3. Select a plan and region
4. Copy the `POSTGRES_PRISMA_URL` connection string
5. Add it to your environment variables

## Step 5: Set Up Vercel Blob Storage

1. In your Vercel project dashboard, go to **Storage**
2. Click **"Create Database"** → **"Blob"**
3. The `BLOB_READ_WRITE_TOKEN` will be automatically set

## Step 6: Deploy Database Schema

After your first deployment, you'll need to run Prisma migrations:

```bash
# Option 1: Using Vercel CLI
vercel env pull .env.local
npx prisma migrate deploy

# Option 2: Using the database directly
npx prisma db push --accept-data-loss
```

Or set up a database seed script that runs on deployment.

## Step 7: Deploy

1. Click **"Deploy"** in the Vercel dashboard
2. Vercel will automatically:
   - Install dependencies (`npm install`)
   - Run Prisma generate (`npx prisma generate`)
   - Build the Next.js app (`next build`)
   - Deploy to production

## Step 8: Configure Custom Domains (Optional)

1. Go to **Settings** → **Domains**
2. Add your custom domain (e.g., `app.madrasah.io`)
3. Update `NEXTAUTH_URL` and `APP_BASE_URL` environment variables
4. Redeploy

## Step 9: Set Up Cron Jobs (Optional)

For nightly usage reporting to Stripe, set up a cron job:

1. Go to **Settings** → **Cron Jobs**
2. Add a new cron job:
   - **Path:** `/api/cron/nightly-usage`
   - **Schedule:** `0 2 * * *` (runs daily at 2 AM UTC)

## Post-Deployment Checklist

- [ ] Database schema is deployed
- [ ] Environment variables are set
- [ ] Test sign-in functionality
- [ ] Test Stripe payment flow
- [ ] Set up domain and update environment variables
- [ ] Create initial owner/admin account
- [ ] Configure webhooks (Stripe, WhatsApp)

## Creating Your First Admin Account

After deployment, you can create an admin account using:

```bash
# Using the API endpoint
curl -X POST https://your-app.vercel.app/api/setup/owner \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "your-secure-password",
    "name": "Admin Name"
  }'
```

Or use the Prisma CLI directly if you have database access.

## Troubleshooting

### Build Fails
- Ensure all environment variables are set
- Check that `POSTGRES_PRISMA_URL` is correct
- Verify Prisma generates correctly (`npx prisma generate`)

### Database Connection Issues
- Verify `POSTGRES_PRISMA_URL` is correct
- Check database is accessible from Vercel's IP ranges
- Ensure SSL mode is enabled if required

### Authentication Not Working
- Verify `NEXTAUTH_URL` matches your deployment URL
- Ensure `NEXTAUTH_SECRET` is set and secure
- Check callback URLs in NextAuth configuration

## Support

For issues, check:
- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)

