# Vercel Deployment Login Fix Guide

## Problem
Your preview deployment is protected by Vercel Preview Protection, which blocks access before your app can handle authentication. You're seeing a 401 Unauthorized error and being redirected to Vercel's login page.

## Solution Steps

### 1. Disable Vercel Preview Protection (IMMEDIATE FIX)

1. Go to your Vercel dashboard: https://vercel.com
2. Navigate to your project: **madrasah-live**
3. Go to **Settings** → **Deployment Protection**
4. Find **"Preview Deployments"** section
5. **Disable Preview Protection** or set it to **"None"**
6. Save changes

**Alternatively**, if you have a production domain, use that instead of the preview URL:
- Production URL: `https://your-production-domain.com/auth/signin`
- Preview URLs are temporary and protected by default

### 2. Set Required Environment Variables in Vercel

Go to **Settings** → **Environment Variables** and add:

#### Critical for Authentication:
```
NEXTAUTH_URL=https://your-production-domain.com
# OR for preview:
# NEXTAUTH_URL=https://madrasah-live.vercel.app

NEXTAUTH_SECRET=your-random-secret-key-minimum-32-characters
```

#### To Enable Demo Mode (if no database):
```
ENABLE_DEMO_MODE=true
```
**OR** simply don't set `DATABASE_URL` - the app will automatically use demo mode.

To generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

#### Database (if using production database):
```
DATABASE_URL=your-postgres-connection-string
```

#### OAuth (if using Google Sign-In):
```
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

#### Other Required Variables:
```
APP_BASE_URL=https://your-production-domain.com
# ... (all other variables from your .env.local)
```

### 3. Redeploy After Changes

After updating environment variables:
1. Go to **Deployments** tab
2. Click **"Redeploy"** on the latest deployment
3. Or push a new commit to trigger a new deployment

### 4. Test Authentication

Once deployed:
1. Visit your sign-in page (production or preview URL)
2. Try logging in with demo credentials:
   - Email: `owner@demo.com`
   - Password: `demo123`

### 5. Production Domain Setup (Recommended)

1. In Vercel dashboard: **Settings** → **Domains**
2. Add your custom domain
3. Update `NEXTAUTH_URL` to match your production domain
4. Update Google OAuth redirect URIs if using Google Sign-In

## Quick Fix Commands

If you have access to Vercel CLI:
```bash
# Install Vercel CLI if needed
npm i -g vercel

# Set environment variables
vercel env add NEXTAUTH_URL production
vercel env add NEXTAUTH_SECRET production
# ... (add all other variables)

# Redeploy
vercel --prod
```

## Troubleshooting

### Still seeing Vercel login page?
- Clear browser cache
- Use incognito/private browsing
- Check if Preview Protection is actually disabled

### NextAuth errors?
- Verify `NEXTAUTH_SECRET` is set (min 32 characters)
- Verify `NEXTAUTH_URL` matches your deployment URL exactly
- Check Vercel function logs: **Deployments** → **View Function Logs**

### Database connection errors?
- Verify `DATABASE_URL` is set correctly
- Check if your database allows connections from Vercel IPs
- Run migrations: `npx prisma migrate deploy`

## Next Steps

After fixing authentication:
1. Test all portals (Owner, Staff, Parent)
2. Verify database connections
3. Test OAuth flows if enabled
4. Monitor Vercel function logs for errors

