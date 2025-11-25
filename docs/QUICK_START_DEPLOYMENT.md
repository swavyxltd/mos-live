# Quick Start: Production Deployment

This is a condensed guide to get Madrasah OS deployed to production quickly. For detailed information, see the full documentation.

## Prerequisites

- [ ] Vercel account
- [ ] Stripe account (production)
- [ ] Resend account
- [ ] Domain name (optional but recommended)
- [ ] PostgreSQL database (Vercel Postgres recommended)

---

## Step 1: Deploy to Vercel (5 minutes)

1. **Push code to GitHub**
   ```bash
   git add .
   git commit -m "Prepare for production"
   git push origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository
   - Click "Deploy"

3. **Wait for deployment** (usually 2-3 minutes)

---

## Step 2: Set Up Database (5 minutes)

1. **Create Vercel Postgres**
   - Vercel Dashboard → Storage → Create Database → Postgres
   - Copy `POSTGRES_PRISMA_URL` (automatically added to env vars)

2. **Run Migrations**
   ```bash
   # Pull env vars
   vercel env pull .env.local
   
   # Run migrations
   npx prisma migrate deploy
   ```

---

## Step 3: Configure Environment Variables (10 minutes)

Go to Vercel Dashboard → Settings → Environment Variables

### Core (Required)
```env
NEXTAUTH_URL=https://your-app.vercel.app
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
APP_BASE_URL=https://your-app.vercel.app
NODE_ENV=production
```

### Stripe (Required)
```env
STRIPE_SECRET_KEY=sk_live_... (from Stripe Dashboard)
STRIPE_PRICE_ID=price_... (create in Stripe Dashboard)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_... (from Stripe Dashboard)
STRIPE_WEBHOOK_SECRET=whsec_... (from Stripe Webhooks)
```

### Email (Required)
```env
RESEND_API_KEY=re_... (from Resend Dashboard)
RESEND_FROM=Madrasah OS <noreply@yourdomain.com>
```

### Blob Storage (Auto-set)
- `BLOB_READ_WRITE_TOKEN` is automatically set when you create Blob Storage

**💡 Tip:** Use `npm run validate-env` to verify all variables are set correctly.

---

## Step 4: Verify Configuration (5 minutes)

Run validation scripts:

```bash
# Validate environment variables
npm run validate-env

# Test database connection
npm run test-db

# Test Stripe configuration
npm run test-stripe

# Test Resend configuration
npm run test-resend
```

---

## Step 5: Set Up Stripe Webhooks (5 minutes)

1. **Go to Stripe Dashboard → Webhooks**
2. **Add endpoint:**
   - URL: `https://your-app.vercel.app/api/webhooks/stripe`
   - Events: Select all `customer.subscription.*`, `invoice.*`, `payment_intent.*`
3. **Copy webhook signing secret** to `STRIPE_WEBHOOK_SECRET` env var
4. **Redeploy** to apply changes

---

## Step 6: Create First Admin Account (2 minutes)

```bash
# Using API endpoint
curl -X POST https://your-app.vercel.app/api/setup/owner \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@yourdomain.com",
    "password": "your-secure-password",
    "name": "Admin Name"
  }'
```

Or use the script:
```bash
npm run add:owner
```

---

## Step 7: Configure Custom Domain (Optional, 10 minutes)

1. **Add domain in Vercel**
   - Settings → Domains → Add Domain
   - Enter: `app.yourdomain.com`

2. **Configure DNS**
   - Add CNAME record: `app` → `cname.vercel-dns.com`
   - Wait for DNS propagation (up to 48 hours, usually < 1 hour)

3. **Update environment variables**
   - Update `NEXTAUTH_URL` and `APP_BASE_URL` to new domain
   - Redeploy

4. **Verify deployment**
   ```bash
   PRODUCTION_URL=https://app.yourdomain.com npm run verify-deployment
   ```

See [Domain Setup Guide](DOMAIN_SETUP.md) for detailed instructions.

---

## Step 8: Set Up Monitoring (15 minutes)

### Error Tracking (Sentry)

1. Sign up at [sentry.io](https://sentry.io)
2. Create Next.js project
3. Follow setup wizard
4. Add `SENTRY_DSN` to environment variables
5. Redeploy

See [Monitoring Setup Guide](MONITORING_SETUP.md) for details.

### Uptime Monitoring (UptimeRobot)

1. Sign up at [uptimerobot.com](https://uptimerobot.com)
2. Create HTTP monitor for your domain
3. Set alert contacts

---

## Step 9: Final Verification (5 minutes)

1. **Test health endpoint:**
   ```bash
   curl https://your-app.vercel.app/api/health
   ```

2. **Test login:**
   - Visit your app URL
   - Log in with admin account
   - Verify dashboard loads

3. **Test payment:**
   - Create test invoice
   - Process test payment
   - Verify webhook received

4. **Run deployment verification:**
   ```bash
   npm run verify-deployment
   ```

---

## Post-Deployment Checklist

- [ ] All environment variables set
- [ ] Database migrations applied
- [ ] First admin account created
- [ ] Stripe webhooks configured
- [ ] Custom domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Error tracking set up
- [ ] Uptime monitoring configured
- [ ] Test login works
- [ ] Test payment works
- [ ] Health check endpoint works

---

## Troubleshooting

### Deployment Fails

1. Check build logs in Vercel Dashboard
2. Verify all environment variables are set
3. Check for TypeScript/ESLint errors
4. Review error messages

### Database Connection Issues

1. Verify `POSTGRES_PRISMA_URL` is set
2. Check SSL mode: `?sslmode=require`
3. Test connection: `npm run test-db`

### Stripe Webhooks Not Working

1. Verify webhook URL is correct
2. Check `STRIPE_WEBHOOK_SECRET` is set
3. Test webhook in Stripe Dashboard
4. Check Vercel function logs

### Email Not Sending

1. Verify `RESEND_API_KEY` is set
2. Check domain is verified in Resend
3. Verify `RESEND_FROM` email matches verified domain
4. Check Resend Dashboard for delivery status

---

## Next Steps

After deployment:

1. **Review [Pre-Launch Checklist](../PRE_LAUNCH_CHECKLIST.md)** for remaining items
2. **Set up backups** (see [Backup Strategy](BACKUP_STRATEGY.md))
3. **Configure monitoring alerts** (see [Monitoring Setup](MONITORING_SETUP.md))
4. **Test all critical flows** (see [Testing Guide](TESTING_GUIDE.md))
5. **Review legal documents** (Terms of Service, Privacy Policy)

---

## Support Resources

- **Full Documentation**: See `docs/` folder
- **API Reference**: [API Documentation](API_DOCUMENTATION.md)
- **Troubleshooting**: [Runbook](RUNBOOK.md)
- **Environment Variables**: [Environment Variables Reference](ENVIRONMENT_VARIABLES.md)

---

**Estimated Total Time**: ~60 minutes

**Last Updated**: 2025-11-25

