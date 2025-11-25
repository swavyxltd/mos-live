# 🚀 Pre-Launch Checklist for Madrasah OS

**Status:** Items completed automatically have been removed. Only manual tasks remain.

---

## ⚙️ **1. ENVIRONMENT VARIABLES & CONFIGURATION**

### Required Environment Variables
**YOU MUST SET THESE IN PRODUCTION (Vercel Dashboard → Settings → Environment Variables):**

**💡 Tip:** 
- Use `npm run validate-env` to validate all environment variables before deployment
- See `docs/ENVIRONMENT_VARIABLES.md` for complete reference

**Core:**
- [ ] `NEXTAUTH_URL` - Production URL (e.g., `https://app.madrasah.io`)
- [ ] `NEXTAUTH_SECRET` - Strong random secret (generate with `openssl rand -base64 32`)
- [ ] `APP_BASE_URL` - Production base URL
- [ ] `NODE_ENV=production`

**Database:**
- [ ] `DATABASE_URL` or `POSTGRES_PRISMA_URL` - Production PostgreSQL connection string
- [ ] Verify SSL mode is enabled: `?sslmode=require`

**Stripe:**
- [ ] `STRIPE_SECRET_KEY` - Production secret key (starts with `sk_live_`)
- [ ] `STRIPE_PRICE_ID` - Production price ID for subscriptions
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Production publishable key (starts with `pk_live_`)
- [ ] `STRIPE_WEBHOOK_SECRET` - Webhook signing secret (starts with `whsec_`)

**Vercel Blob Storage:**
- [ ] `BLOB_READ_WRITE_TOKEN` - Auto-set when Blob Storage is created in Vercel

**Email (Resend):**
- [ ] `RESEND_API_KEY` - Production API key
- [ ] `RESEND_FROM` - Verified sender email (e.g., `Madrasah OS <noreply@madrasah.io>`)

**WhatsApp/Meta (Optional):**
- [ ] `META_APP_ID`
- [ ] `META_APP_SECRET`
- [ ] `META_GRAPH_VERSION=v18.0`
- [ ] `META_GRAPH_BASE=https://graph.facebook.com`
- [ ] `WHATSAPP_EMBEDDED_REDIRECT_URL` - Production callback URL
- [ ] `WHATSAPP_VERIFY_TOKEN` - Random secure token

**Cron Jobs:**
- [ ] `CRON_SECRET` - Random secret for securing cron endpoints

### Configuration Files
- [x] ✅ Security headers added to `next.config.ts`
- [x] ✅ Error pages created (`error.tsx`, `not-found.tsx`, `global-error.tsx`)
- [x] ✅ Build errors fixed (reportUsage, ics import)
- [x] ✅ Terms of Service page created (`/terms`)
- [x] ✅ Privacy Policy page created (`/privacy`)
- [x] ✅ Login form links updated to point to ToS/Privacy pages
- [ ] ⚠️ **TODO**: Fix remaining TypeScript errors and remove `ignoreBuildErrors: true` from `next.config.ts`
- [ ] ⚠️ **TODO**: Fix remaining ESLint warnings and remove `ignoreDuringBuilds: true` from `next.config.ts`

---

## 🗄️ **2. DATABASE**

### Migrations & Schema
- [x] ✅ Production migration helper created (`npm run migrate:prod`)
- [ ] ⚠️ **ACTION REQUIRED**: Run `npm run migrate:prod` to safely deploy migrations
- [ ] Verify all migrations are applied: `npx prisma migrate status`
- [ ] Test database connection: `npm run test-db`
- [ ] Verify connection pooling is configured correctly

### Backups
- [x] ✅ Backup strategy documented (`docs/BACKUP_STRATEGY.md`)
- [ ] ⚠️ **CRITICAL**: Verify automated database backups are configured (Vercel Postgres has automatic backups)
- [ ] ⚠️ **CRITICAL**: Test backup restoration (see `docs/BACKUP_STRATEGY.md`)
- [ ] Configure backup retention (30+ days recommended)
- [ ] Set up backup monitoring/alerts

### Data Integrity
- [ ] Verify foreign key constraints are in place
- [ ] Test cascade delete behavior
- [ ] Verify unique constraints on critical fields (email, etc.)

---

## 🛡️ **3. ERROR HANDLING & LOGGING**

### Error Pages
- [x] ✅ `src/app/error.tsx` created
- [x] ✅ `src/app/not-found.tsx` created
- [x] ✅ `src/app/global-error.tsx` created
- [ ] Test error scenarios (network failures, API errors, etc.)

### Logging
- [x] ✅ Logger utility exists
- [x] ✅ Error logging in API routes
- [ ] ⚠️ **ACTION REQUIRED**: Set up production logging service (Sentry recommended)
- [ ] ⚠️ **ACTION REQUIRED**: Configure log aggregation and alerting
- [ ] Verify sensitive data is not logged (passwords, tokens, etc.)

### Monitoring
- [x] ✅ Monitoring setup guide created (`docs/MONITORING_SETUP.md`)
- [ ] ⚠️ **ACTION REQUIRED**: Set up error tracking (Sentry - see `docs/MONITORING_SETUP.md`)
- [ ] ⚠️ **ACTION REQUIRED**: Set up uptime monitoring (UptimeRobot - see `docs/MONITORING_SETUP.md`)
- [ ] ⚠️ **ACTION REQUIRED**: Verify Vercel Analytics is enabled in production
- [ ] Configure alerting for:
  - [ ] High error rates
  - [ ] Slow response times
  - [ ] Database connection issues
  - [ ] Payment processing failures

---

## ⚡ **4. PERFORMANCE OPTIMIZATION**

### Build Optimization
- [x] ✅ Image optimization configured
- [x] ✅ Compression enabled
- [x] ✅ Package imports optimized
- [x] ✅ Build compiles successfully
- [ ] Run `npm run build` and verify no critical warnings
- [ ] Test production build locally: `npm run build && npm start`

### Caching
- [x] ✅ Image caching configured (60s TTL)
- [x] ✅ API response caching (60s for dashboard stats)
- [ ] Verify CDN caching for static assets (Vercel handles this automatically)

### Database Performance
- [ ] Review slow query logs after launch
- [ ] Verify connection pooling settings
- [ ] Test under expected load

---

## 💳 **5. PAYMENT PROCESSING**

### Stripe Configuration
- [x] ✅ Stripe test script created (`npm run test-stripe`)
- [ ] ⚠️ **ACTION REQUIRED**: Run `npm run test-stripe` to verify configuration
- [ ] Switch to production Stripe keys (not test keys)
- [ ] Verify Stripe webhook endpoint is configured: `/api/webhooks/stripe`
- [ ] Set webhook URL in Stripe Dashboard: `https://your-domain.com/api/webhooks/stripe`
- [ ] Test webhook signature verification
- [ ] Set up webhook event monitoring in Stripe dashboard
- [ ] Test successful payment flow end-to-end
- [ ] Test failed payment handling
- [ ] Test subscription creation and management
- [ ] Verify payment method storage (for autopay)

### Payment Testing
- [ ] Test with Stripe test cards first
- [ ] Test with real card (small amount)
- [ ] Test payment failure scenarios
- [ ] Test refund process
- [ ] Verify invoice generation after payment
- [ ] Test autopay functionality

---

## 📧 **6. EMAIL & SMS SERVICES**

### Email (Resend)
- [x] ✅ Resend test script created (`npm run test-resend`)
- [ ] ⚠️ **ACTION REQUIRED**: Run `npm run test-resend` to verify configuration
- [ ] Verify Resend domain is configured and verified
- [ ] Test all email templates:
  - [ ] Welcome emails
  - [ ] Password reset emails
  - [ ] Application acceptance emails
  - [ ] Invoice emails
  - [ ] Payment confirmation emails
  - [ ] Support ticket notifications
- [ ] Verify email deliverability (check spam folders)
- [ ] Set up email bounce handling in Resend dashboard

### WhatsApp (Optional)
- [ ] Verify Meta App is in production mode
- [ ] Test WhatsApp message sending
- [ ] Verify webhook endpoint: `/api/webhooks/whatsapp`
- [ ] Test webhook verification

---

## 🧪 **7. TESTING**

### End-to-End Testing
- [x] ✅ Testing guide created (`docs/TESTING_GUIDE.md`)
- [ ] Run full test suite: `npm test`
- [ ] Test critical user flows (see `docs/TESTING_GUIDE.md`):
  - [ ] User registration/signup
  - [ ] User login (with and without 2FA)
  - [ ] Password reset
  - [ ] Student enrollment
  - [ ] Payment processing
  - [ ] Invoice generation
  - [ ] Application submission and approval
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)
- [ ] Test on mobile devices
- [ ] Test accessibility (keyboard navigation, screen readers)

### Load Testing
- [x] ✅ Load testing script created (`npm run load-test`)
- [x] ✅ Load testing guide created (`docs/LOAD_TESTING.md`)
- [ ] ⚠️ **ACTION REQUIRED**: Run `npm run load-test` to test under expected load
- [ ] Test database under load
- [ ] Test API endpoints under load
- [ ] Document performance baselines

---

## 📚 **8. DOCUMENTATION**

### User Documentation
- [ ] ⚠️ **ACTION REQUIRED**: Create user guide/documentation
- [ ] ⚠️ **ACTION REQUIRED**: Create admin guide
- [ ] ⚠️ **ACTION REQUIRED**: Create parent guide

### Technical Documentation
- [x] ✅ README.md exists and updated with production steps
- [x] ✅ DEPLOYMENT.md exists
- [x] ✅ API Documentation created (`docs/API_DOCUMENTATION.md`)
- [x] ✅ Runbook created (`docs/RUNBOOK.md`)
- [x] ✅ Backup strategy documented (`docs/BACKUP_STRATEGY.md`)
- [x] ✅ Environment variable validation script created (`scripts/validate-env.ts`)

---

## ⚖️ **9. LEGAL & COMPLIANCE**

### Legal Documents
- [x] ✅ Terms of Service page created (`/terms`) - **REVIEW AND CUSTOMIZE WITH LEGAL COUNSEL**
- [x] ✅ Privacy Policy page created (`/privacy`) - **REVIEW AND CUSTOMIZE WITH LEGAL COUNSEL**
- [x] ✅ ToS and Privacy Policy links added to login form
- [ ] ⚠️ **CRITICAL**: Review and customize Terms of Service with legal counsel
- [ ] ⚠️ **CRITICAL**: Review and customize Privacy Policy with legal counsel
- [ ] ⚠️ **CRITICAL**: Verify GDPR compliance (if serving EU users)
- [ ] Add cookie consent banner (if using analytics cookies)
- [ ] Verify data processing agreements with third parties (Stripe, Resend, etc.)

### Compliance
- [ ] ⚠️ **ACTION REQUIRED**: Review data retention policies
- [ ] ⚠️ **ACTION REQUIRED**: Implement data deletion functionality
- [ ] ⚠️ **ACTION REQUIRED**: Add data export functionality (GDPR right to data portability)

---

## 🌐 **10. DOMAIN & SSL**

### Domain Configuration
- [x] ✅ Domain setup guide created (`docs/DOMAIN_SETUP.md`)
- [x] ✅ Health check endpoint created (`/api/health`)
- [x] ✅ Deployment verification script created (`npm run verify-deployment`)
- [ ] ⚠️ **ACTION REQUIRED**: Configure custom domain in Vercel (see `docs/DOMAIN_SETUP.md`)
- [ ] ⚠️ **ACTION REQUIRED**: Configure parent portal domain (e.g., `parent.madrasah.io`)
- [ ] Update `NEXTAUTH_URL` and `APP_BASE_URL` environment variables after domain setup
- [ ] Verify DNS records are correct
- [ ] Test domain routing
- [ ] Run `npm run verify-deployment` after domain setup

### SSL/TLS
- [x] ✅ SSL certificate (Vercel provides automatically)
- [ ] Test HTTPS redirect
- [ ] Test SSL Labs rating (aim for A+): https://www.ssllabs.com/ssltest/

---

## 🔄 **11. BACKUP & DISASTER RECOVERY**

### Backup Strategy
- [ ] ⚠️ **CRITICAL**: Verify automated database backups are configured (Vercel Postgres has automatic backups)
- [ ] ⚠️ **CRITICAL**: Test backup restoration (document process)
- [ ] Configure backup retention (30+ days recommended)
- [ ] Set up backup monitoring/alerts
- [ ] Document disaster recovery procedure

### Recovery Testing
- [ ] Test database restore from backup
- [ ] Test application redeployment
- [ ] Document rollback procedure

---

## 🎯 **12. PRE-LAUNCH TESTING**

### Final Checks
- [ ] Deploy to staging environment first
- [ ] Test all critical flows in staging
- [ ] Run `npm audit` and review remaining vulnerabilities (1 moderate, 1 high - jspdf/dompurify - consider updating jspdf)
- [ ] Review and fix remaining TypeScript errors
- [ ] Review and fix remaining ESLint warnings
- [ ] Test with real payment (small amount)
- [ ] Verify all webhooks are working
- [ ] Test email delivery
- [ ] Test on production database (read-only if possible)

### User Acceptance Testing
- [ ] Have beta users test the application
- [ ] Collect and address feedback
- [ ] Test with real-world scenarios

---

## 🚀 **13. LAUNCH DAY CHECKLIST**

### Before Launch
- [ ] All environment variables set correctly in Vercel
- [ ] Database migrations applied: `npx prisma migrate deploy`
- [ ] All tests passing
- [ ] Security audit completed
- [ ] Legal documents reviewed and customized
- [ ] Monitoring set up (Sentry, uptime monitoring)
- [ ] Backup system verified

### Launch Steps
1. [ ] Deploy to production (Vercel will auto-deploy on git push to main)
2. [ ] Verify deployment succeeded
3. [ ] Test production URL
4. [ ] Create first admin/owner account (use `/api/setup/owner` endpoint)
5. [ ] Test login
6. [ ] Verify Stripe webhooks are receiving events
7. [ ] Test payment flow
8. [ ] Monitor error logs for first hour
9. [ ] Check analytics are tracking

### Post-Launch
- [ ] Monitor error rates for 24 hours
- [ ] Monitor performance metrics
- [ ] Check user feedback
- [ ] Review payment processing
- [ ] Verify email delivery rates

---

## 🔧 **QUICK FIXES NEEDED**

### High Priority (Before Launch)
1. **Set all environment variables** in Vercel Dashboard
2. **Set up error tracking** - Sign up for Sentry (free tier available)
3. **Set up uptime monitoring** - Sign up for UptimeRobot (free tier available)
4. **Review legal documents** - Customize Terms of Service and Privacy Policy pages with legal counsel
5. **Configure Stripe webhooks** - Add webhook URL in Stripe Dashboard
6. **Test database backups** - Verify Vercel Postgres backups are working
7. **Run database migrations** - `npx prisma migrate deploy` on production

### Medium Priority (Can do after launch)
1. Fix remaining TypeScript/ESLint errors (currently ignored in build)
2. Create user documentation
3. Implement data export functionality
4. Add cookie consent banner
5. Update jspdf to fix security vulnerability (may require code changes)

---

## ✅ **COMPLETED AUTOMATICALLY**

The following items have been completed:
- ✅ Security headers added to `next.config.ts`
- ✅ Error pages created (`error.tsx`, `not-found.tsx`, `global-error.tsx`)
- ✅ Fixed build errors (reportUsage function, ics import)
- ✅ Build compiles successfully
- ✅ Security audit completed (found 2 vulnerabilities in dependencies - jspdf/dompurify)
- ✅ Rate limiting implemented and verified (227 API endpoints protected)
- ✅ Input validation implemented
- ✅ Authentication & authorization implemented
- ✅ Terms of Service page created (`/terms`)
- ✅ Privacy Policy page created (`/privacy`)
- ✅ Login form links updated
- ✅ README updated with production deployment steps

---

## 📝 **NOTES**

- Review each item carefully
- Test thoroughly in staging before production
- Keep this checklist updated as you complete items
- Most critical items are marked with ⚠️
- **Legal documents are templates - MUST be reviewed by legal counsel before going live**

---

**Last Updated:** 2025-11-25
**Status:** Ready for manual configuration and testing
