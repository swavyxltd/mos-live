# Vercel Environment Variables Cleanup Guide

## ✅ REQUIRED Environment Variables (Keep These)

### Core Configuration
- `NEXTAUTH_URL` - Required for authentication
- `NEXTAUTH_SECRET` - Required for session encryption
- `APP_BASE_URL` - Required for generating absolute URLs
- `NODE_ENV` - Should be `production` in production

### Database
- `POSTGRES_PRISMA_URL` - **OR** `DATABASE_URL` (you only need one)
  - If using Vercel Postgres, use `POSTGRES_PRISMA_URL`
  - If using external Postgres, use `DATABASE_URL`
  - **Remove the one you're NOT using**

### Stripe (Platform Billing)
- `STRIPE_SECRET_KEY` - Required (starts with `sk_live_` in production)
- `STRIPE_PRICE_ID` - Required for platform billing subscriptions
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Required for frontend Stripe.js
- `STRIPE_WEBHOOK_SECRET` - Required for webhook verification

### Stripe Connect (Parent Payments)
- No additional env vars needed - uses same `STRIPE_SECRET_KEY`

### Vercel Blob Storage
- `BLOB_READ_WRITE_TOKEN` - Required for file storage

### Email (Resend)
- `RESEND_API_KEY` - Required for sending emails
- `RESEND_FROM` - Required sender email address

### Cron Jobs
- `CRON_SECRET` - Required if using cron endpoints (recommended for security)

---

## ❌ OPTIONAL Environment Variables (Can Remove If Not Used)

### WhatsApp/Meta Integration (Optional)
Only keep if you're using WhatsApp features:
- `META_APP_ID`
- `META_APP_SECRET`
- `META_GRAPH_VERSION` (defaults to `v18.0` if not set)
- `META_GRAPH_BASE` (defaults to `https://graph.facebook.com` if not set)
- `WHATSAPP_EMBEDDED_REDIRECT_URL`
- `WHATSAPP_VERIFY_TOKEN`
- `WHATSAPP_DEV_ACCESS_TOKEN` (development only - remove from production)
- `WHATSAPP_DEV_PHONE_NUMBER_ID` (development only - remove from production)
- `WHATSAPP_DEV_WABA_ID` (development only - remove from production)

### Development/Demo Only (Remove from Production)
- `FORCE_EMAIL_SEND` - Development only
- `ENABLE_DEMO_MODE` - Demo/testing only
- `SETUP_SECRET` - Setup/onboarding only (if not needed after initial setup)
- Any variables starting with `WHATSAPP_DEV_`

### Legacy/Unused (Can Remove)
- `STRIPE_PRODUCT_ID` - Not used in code (only `STRIPE_PRICE_ID` is used)
- `PARENT_PORTAL_URL` - Optional, defaults to `APP_BASE_URL`

### Auto-Set by Vercel (Don't Set Manually)
- `VERCEL` - Auto-set by Vercel
- `VERCEL_ENV` - Auto-set by Vercel
- `VERCEL_URL` - Auto-set by Vercel

---

## 🧹 Cleanup Checklist

### Step 1: Remove Duplicates
- [ ] If you have both `DATABASE_URL` and `POSTGRES_PRISMA_URL`, remove the one you're NOT using
- [ ] If you have both test and live Stripe keys, remove test keys from production

### Step 2: Remove Unused Optional Features
- [ ] Remove all WhatsApp/Meta variables if not using WhatsApp
- [ ] Remove `STRIPE_PRODUCT_ID` (not used, only `STRIPE_PRICE_ID` is needed)
- [ ] Remove development-only variables from production

### Step 3: Remove Auto-Set Variables
- [ ] Remove `VERCEL`, `VERCEL_ENV`, `VERCEL_URL` (Vercel sets these automatically)

### Step 4: Verify Required Variables
- [ ] Ensure all required variables are set
- [ ] Verify production keys (not test keys)
- [ ] Check `NODE_ENV=production` is set

---

## 📋 Minimum Required Variables for Production

```
NEXTAUTH_URL
NEXTAUTH_SECRET
APP_BASE_URL
NODE_ENV=production
POSTGRES_PRISMA_URL (or DATABASE_URL)
STRIPE_SECRET_KEY
STRIPE_PRICE_ID
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_WEBHOOK_SECRET
BLOB_READ_WRITE_TOKEN
RESEND_API_KEY
RESEND_FROM
CRON_SECRET
```

**Total: 13 required variables**

---

## 🚨 Variables to Definitely Remove

1. **`STRIPE_PRODUCT_ID`** - Not used in code
2. **`DATABASE_URL`** - If you're using `POSTGRES_PRISMA_URL` (or vice versa)
3. **Test keys in production** - Any `sk_test_` or `pk_test_` keys
4. **Development variables** - `FORCE_EMAIL_SEND`, `WHATSAPP_DEV_*`
5. **Auto-set variables** - `VERCEL`, `VERCEL_ENV`, `VERCEL_URL`
6. **WhatsApp variables** - If not using WhatsApp integration

---

## How to Clean Up in Vercel

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Review each variable
3. Delete variables that are:
   - Not in the required list above
   - Duplicates (e.g., both DATABASE_URL and POSTGRES_PRISMA_URL)
   - Development-only variables
   - Auto-set by Vercel
4. After cleanup, redeploy to ensure everything still works

