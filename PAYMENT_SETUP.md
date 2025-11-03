# Payment System Setup Guide

## Overview

The payment system is now implemented with:
- **£1 per student per month** billing
- **1 month free trial** from signup date
- **Variable pricing** - subscription amount changes monthly based on student count
- **Card required** - orgs must add card before adding any data

## Environment Variables Required

Add these to your Vercel project settings:

```
STRIPE_SECRET_KEY=[Your Stripe Secret Key]
STRIPE_PRODUCT_ID=[Your Stripe Product ID]
STRIPE_PRICE_ID=[Your Stripe Price ID]
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=[Your Stripe Publishable Key]
STRIPE_WEBHOOK_SECRET=[Your Stripe Webhook Secret]
```

## Stripe Webhook Setup

1. Go to https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://app.madrasah.io/api/webhooks/stripe`
4. Select these events:
   - `setup_intent.succeeded`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and update `STRIPE_WEBHOOK_SECRET` if different

## Cron Job Setup

The cron job is configured in `vercel.json` to run daily at midnight UTC:
- Path: `/api/cron/billing`
- Schedule: `0 0 * * *` (daily at midnight)

Vercel will automatically set this up when you deploy. No manual configuration needed.

## How It Works

1. **Org Signup**: 
   - Gets 1 month free trial
   - Billing anniversary = signup date (e.g., if signup on 15th, billed on 15th each month)

2. **Card Setup Required**:
   - Admin must add card before adding students/staff/attendance
   - Payment gate blocks all data entry until card is added

3. **Subscription Creation**:
   - When card is added, subscription is created with trial
   - Quantity = current student count

4. **Monthly Billing**:
   - Day before anniversary: Count active students
   - Anniversary date: Stripe charges based on student count
   - Amount varies each month (e.g., 150 students = £150, 180 students = £180)

## Database Migration

The database schema has been updated. Run this in production:

```bash
npx prisma migrate deploy
```

Or if using `db push`:
```bash
npx prisma db push
```

## Testing

1. Create a new org
2. Try to add a student - should be blocked until card is added
3. Add card via settings
4. Verify subscription is created in Stripe dashboard
5. Wait for billing anniversary to test monthly billing

## Troubleshooting

- **Payment gate not working**: Check `/api/settings/platform-payment` endpoint
- **Webhook not receiving events**: Verify webhook URL and secret in Stripe dashboard
- **Cron job not running**: Check Vercel cron jobs in dashboard
- **Subscription not created**: Check Stripe logs and webhook events

