# Runbook - Common Issues and Solutions

## Table of Contents
1. [Database Issues](#database-issues)
2. [Authentication Issues](#authentication-issues)
3. [Payment Processing Issues](#payment-processing-issues)
4. [Email Delivery Issues](#email-delivery-issues)
5. [Performance Issues](#performance-issues)
6. [Deployment Issues](#deployment-issues)

---

## Database Issues

### Issue: Database Connection Failed

**Symptoms:**
- Error: "Can't reach database server"
- 500 errors on API endpoints
- Prisma connection errors

**Solutions:**
1. Check `DATABASE_URL` or `POSTGRES_PRISMA_URL` environment variable
2. Verify database is running and accessible
3. Check SSL mode: `?sslmode=require`
4. Verify IP whitelist (if applicable)
5. Check connection pool limits

**Commands:**
```bash
# Test database connection
npx prisma db execute --stdin <<< "SELECT 1"

# Check connection string format
echo $DATABASE_URL
```

---

### Issue: Migration Failed

**Symptoms:**
- Error during `prisma migrate deploy`
- Schema drift warnings

**Solutions:**
1. Check migration status: `npx prisma migrate status`
2. Review failed migration in `prisma/migrations/`
3. Manually fix migration if needed
4. Reset if in development: `npx prisma migrate reset` (⚠️ deletes data)

**Commands:**
```bash
# Check migration status
npx prisma migrate status

# Deploy migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate
```

---

## Authentication Issues

### Issue: Users Can't Login

**Symptoms:**
- "Invalid email or password" errors
- Account locked messages
- Session not persisting

**Solutions:**
1. Check `NEXTAUTH_URL` matches production URL
2. Verify `NEXTAUTH_SECRET` is set and secure
3. Check account lockout status in database
4. Verify password hashing (bcrypt)
5. Check session cookie settings

**Database Query:**
```sql
-- Check user account status
SELECT email, "lockedUntil", "failedLoginAttempts" 
FROM "User" 
WHERE email = 'user@example.com';

-- Unlock account (if needed)
UPDATE "User" 
SET "lockedUntil" = NULL, "failedLoginAttempts" = 0 
WHERE email = 'user@example.com';
```

---

### Issue: 2FA Not Working

**Symptoms:**
- 2FA codes not sending
- Codes not validating

**Solutions:**
1. Check email delivery (2FA codes sent via email)
2. Verify `RESEND_API_KEY` is set
3. Check code expiration time (default: 10 minutes)
4. Verify email template is rendering correctly

---

## Payment Processing Issues

### Issue: Stripe Payments Failing

**Symptoms:**
- Payment intents failing
- Webhook errors
- Subscription creation failures

**Solutions:**
1. Verify Stripe keys are production keys (not test)
2. Check Stripe Dashboard for error logs
3. Verify webhook endpoint is configured
4. Check webhook signature verification
5. Review Stripe API logs

**Stripe Dashboard Checks:**
- Go to Stripe Dashboard → Developers → Logs
- Check for failed API calls
- Verify webhook events are being received

---

### Issue: Webhooks Not Receiving Events

**Symptoms:**
- Payments not updating in system
- Subscriptions not syncing

**Solutions:**
1. Verify webhook URL in Stripe Dashboard
2. Check webhook secret matches `STRIPE_WEBHOOK_SECRET`
3. Test webhook endpoint manually
4. Check Vercel function logs for webhook errors
5. Verify webhook signature validation

**Test Webhook:**
```bash
# Use Stripe CLI to test
stripe listen --forward-to localhost:3000/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

---

## Email Delivery Issues

### Issue: Emails Not Sending

**Symptoms:**
- Users not receiving emails
- Email errors in logs

**Solutions:**
1. Verify `RESEND_API_KEY` is set and valid
2. Check `RESEND_FROM` email is verified in Resend
3. Review Resend Dashboard for delivery status
4. Check spam folders
5. Verify email template rendering

**Resend Dashboard:**
- Go to Resend Dashboard → Emails
- Check delivery status and bounce rates
- Verify domain is authenticated

---

### Issue: Email Bounces

**Symptoms:**
- High bounce rate
- Emails marked as spam

**Solutions:**
1. Verify sender domain in Resend
2. Set up SPF, DKIM, DMARC records
3. Remove invalid email addresses from database
4. Review bounce reasons in Resend Dashboard

---

## Performance Issues

### Issue: Slow API Responses

**Symptoms:**
- High response times
- Timeout errors

**Solutions:**
1. Check database query performance
2. Review slow query logs
3. Add database indexes for frequently queried fields
4. Check connection pool settings
5. Review API rate limiting

**Database Indexes to Add:**
```sql
-- Example indexes (adjust based on your queries)
CREATE INDEX idx_student_orgid ON "Student"("orgId");
CREATE INDEX idx_invoice_status ON "Invoice"("status");
CREATE INDEX idx_payment_created ON "Payment"("createdAt");
```

---

### Issue: High Memory Usage

**Symptoms:**
- Application crashes
- Out of memory errors

**Solutions:**
1. Review large data queries
2. Implement pagination for large datasets
3. Check for memory leaks
4. Review Vercel function memory limits
5. Optimize image processing

---

## Deployment Issues

### Issue: Build Fails

**Symptoms:**
- Deployment fails on Vercel
- Build errors

**Solutions:**
1. Check build logs in Vercel Dashboard
2. Verify all environment variables are set
3. Check for TypeScript/ESLint errors
4. Review `package.json` scripts
5. Verify Node.js version matches (18+)

**Common Build Issues:**
- Missing environment variables
- Prisma client not generated
- TypeScript errors (if not ignored)
- Missing dependencies

---

### Issue: Environment Variables Not Working

**Symptoms:**
- Variables undefined in production
- Different behavior in production vs local

**Solutions:**
1. Verify variables are set in Vercel Dashboard
2. Check variable names match exactly (case-sensitive)
3. Redeploy after adding variables
4. Verify `NEXT_PUBLIC_*` prefix for client-side variables
5. Check variable scope (Production, Preview, Development)

---

## Monitoring and Alerts

### Setting Up Alerts

**Recommended Alerts:**
1. **Error Rate**: Alert if error rate > 5% in 5 minutes
2. **Response Time**: Alert if p95 > 2 seconds
3. **Database Connection**: Alert on connection failures
4. **Payment Failures**: Alert on Stripe API errors
5. **Email Bounce Rate**: Alert if bounce rate > 10%

**Tools:**
- Sentry for error tracking
- Vercel Analytics for performance
- UptimeRobot for uptime monitoring
- Stripe Dashboard for payment alerts

---

## Emergency Procedures

### Complete System Outage

1. **Assess**: Determine scope of outage
2. **Communicate**: Notify users if needed
3. **Restore**: Follow disaster recovery procedure
4. **Verify**: Test critical functions
5. **Monitor**: Watch for 24 hours after restoration

### Data Loss

1. **Stop**: Immediately stop all write operations
2. **Assess**: Determine what data is lost
3. **Restore**: Restore from most recent backup
4. **Verify**: Validate data integrity
5. **Resume**: Gradually resume operations

---

## Useful Commands

```bash
# Database
npx prisma studio                    # Open Prisma Studio
npx prisma migrate status            # Check migration status
npx prisma migrate deploy            # Deploy migrations
npx prisma db push                   # Push schema (dev only)

# Environment
npm run validate-env                 # Validate environment variables
vercel env pull .env.local          # Pull env vars from Vercel

# Testing
npm test                            # Run tests
npm run build                       # Test production build

# Logs
vercel logs                         # View Vercel logs
```

---

## Support Contacts

- **Vercel Support**: support@vercel.com
- **Stripe Support**: https://support.stripe.com
- **Resend Support**: support@resend.com
- **Database Provider**: [Your provider support]

---

**Last Updated**: 2025-11-25
**Review Schedule**: Quarterly

