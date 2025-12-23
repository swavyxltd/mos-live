# Automatic Billing System Explanation

## How Organisations Get Billed Automatically via Stripe

This document explains how the automatic billing system works for organisations in Madrasah OS.

---

## Overview

**Pricing Model**: £2 per student per month  
**Billing Method**: Variable Quantity Subscription (Stripe)  
**Billing Frequency**: Monthly (on organisation's anniversary date)  
**Trial Period**: 1 month free trial from signup

---

## How It Works (Step by Step)

### 1. **Organisation Signup**

When an organisation signs up:
- A `PlatformOrgBilling` record is created
- **Billing Anniversary Date** = Day of month they signed up (e.g., if signup on 15th, billed on 15th each month)
- **Trial End Date** = 1 month from signup
- Status: `trialing` (no payment required yet)

### 2. **Card Setup (Required Before Adding Data)**

Before an organisation can add students/staff/attendance:
- Admin must add a payment card via Stripe Elements
- Card is saved as `defaultPaymentMethodId` in billing record
- Stripe Customer is created/updated

**Code Location**: `src/lib/stripe.ts` → `createPlatformSetupIntent()`

### 3. **Subscription Creation**

When card is successfully added:
- Subscription is created in Stripe with:
  - **Price**: `STRIPE_PRICE_ID` (must be configured as £2 per unit)
  - **Quantity**: Current active student count
  - **Trial End**: 1 month from signup
  - **Payment Method**: The card just added
- Subscription ID saved to database

**Code Location**: `src/lib/stripe.ts` → `createPlatformSubscription()`

### 4. **Monthly Billing Process (Automatic)**

Every day at midnight UTC, a cron job runs:

**Cron Job**: `/api/cron/billing` (configured in `vercel.json`)

**What it does**:
1. Finds all organisations whose **billing anniversary is TOMORROW**
2. For each organisation:
   - Counts **active students** (non-archived)
   - Updates Stripe subscription **quantity** to match student count
   - Stripe automatically charges the card on the anniversary date

**Code Location**: `src/app/api/cron/billing/route.ts`

**Example**:
- Org signed up on 15th → Anniversary = 15th of each month
- On 14th at midnight → Cron runs, counts students, updates quantity
- On 15th → Stripe automatically charges: `quantity × £2`

### 5. **Stripe Webhooks (Status Updates)**

Stripe sends webhooks when:
- Subscription is created/updated
- Invoice is paid
- Invoice payment fails
- Subscription is canceled

**Webhook Handler**: `/api/webhooks/stripe`

**What it does**:
- Updates subscription status in database
- Handles payment failures (marks org as `past_due`)
- Reactivates org when payment succeeds
- Logs all billing events

**Code Location**: `src/app/api/webhooks/stripe/route.ts`

---

## Key Components

### 1. **Variable Quantity Subscription**

Instead of metered billing, we use **variable quantity**:
- Subscription quantity = number of students
- Stripe charges: `quantity × price_per_unit`
- Quantity is updated **before** billing date

**Why this approach?**
- Simpler than metered billing
- Predictable charges
- Easier to understand for customers
- No need for usage records

### 2. **Billing Anniversary System**

Each org has a `billingAnniversaryDate` (1-31):
- Set to signup day of month
- Billed on same day each month
- Cron runs day before to update quantity

**Example**:
```
Org signs up: Jan 15
Anniversary: 15th of each month
Cron runs: 14th at midnight (updates quantity)
Stripe charges: 15th (automatic)
```

### 3. **Active Student Count**

Only **non-archived** students are counted:
- Archived students don't count toward billing
- Count happens on day before anniversary
- Ensures accurate billing

**Code**: `src/lib/stripe.ts` → `getActiveStudentCount()`

---

## Safety Mechanisms

### 1. **Payment Failure Handling**

**Cron Job**: `/api/cron/check-overdue` (runs daily)

**What it does**:
- Checks for subscriptions with `past_due` status
- Marks org as `DEACTIVATED` or `PAUSED` if payment fails
- Sends notifications (if configured)

**Code Location**: `src/app/api/cron/check-overdue/route.ts`

### 2. **Only Active Orgs Are Billed**

The billing cron only processes:
- Organisations with status = `ACTIVE`
- Subscriptions with status = `active` or `trialing`
- Organisations with payment method on file

**Code Check**:
```typescript
org: {
  status: 'ACTIVE' // Only bill active organisations
}
```

### 3. **Error Handling**

- All billing operations are logged
- Errors don't stop other orgs from being billed
- Failed billing attempts are recorded in audit log

---

## Verification Checklist

To ensure billing works properly:

### ✅ **Stripe Configuration**

1. **Price Setup**:
   - Go to Stripe Dashboard → Products
   - Create product: "Madrasah OS Platform Fee"
   - Create price: £2.00 per unit, recurring monthly
   - Copy Price ID → Set as `STRIPE_PRICE_ID`

2. **Webhook Setup**:
   - Stripe Dashboard → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`
   - Copy webhook secret → Set as `STRIPE_WEBHOOK_SECRET`

### ✅ **Cron Jobs**

1. **Billing Cron** (`/api/cron/billing`):
   - Configured in `vercel.json`
   - Runs daily at midnight UTC
   - Updates subscription quantities

2. **Overdue Check Cron** (`/api/cron/check-overdue`):
   - Configured in `vercel.json`
   - Runs daily at midnight UTC
   - Handles payment failures

### ✅ **Database**

1. **Billing Records**:
   - Each org has `PlatformOrgBilling` record
   - `billingAnniversaryDate` is set (1-31)
   - `stripeSubscriptionId` is set after card is added

2. **Student Count**:
   - Only non-archived students count
   - Counted on day before anniversary

---

## Testing the Billing System

### Manual Test

1. **Create test org**:
   ```bash
   # Sign up as new organisation
   ```

2. **Add card**:
   - Go to Settings → Platform Payment
   - Add test card: `4242 4242 4242 4242`
   - Verify subscription is created in Stripe Dashboard

3. **Test billing cron**:
   ```bash
   # Manually trigger billing cron
   curl -X POST https://your-domain.com/api/cron/billing \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

4. **Verify in Stripe**:
   - Check subscription quantity matches student count
   - Verify billing date is correct

### Automated Test

```bash
# Test billing endpoint
npm run test-stripe

# Check which orgs will be billed tomorrow
curl https://your-domain.com/api/cron/billing
```

---

## Common Issues & Solutions

### Issue: Orgs Not Getting Billed

**Check**:
1. Is cron job running? (Check Vercel logs)
2. Is `billingAnniversaryDate` set correctly?
3. Is subscription status `active` or `trialing`?
4. Is org status `ACTIVE`?
5. Is payment method on file?

### Issue: Wrong Amount Charged

**Check**:
1. Is student count correct? (only non-archived)
2. Is subscription quantity updated? (check Stripe Dashboard)
3. Is price configured as £2 per unit?

### Issue: Payment Failures Not Handled

**Check**:
1. Is webhook endpoint configured?
2. Is `STRIPE_WEBHOOK_SECRET` set?
3. Are webhook events being received? (Check Stripe Dashboard → Webhooks → Events)

---

## Monitoring

### What to Monitor

1. **Billing Cron Success Rate**:
   - Check Vercel function logs
   - Verify orgs are being processed

2. **Stripe Dashboard**:
   - Monitor subscription statuses
   - Check for failed payments
   - Review invoice history

3. **Database**:
   - Check `lastBilledAt` timestamps
   - Verify `lastBilledStudentCount` is accurate
   - Monitor `subscriptionStatus` changes

### Alerts to Set Up

1. **Billing Cron Failures**: Alert if cron fails
2. **Payment Failures**: Alert when invoice payment fails
3. **Subscription Issues**: Alert if subscription status changes unexpectedly

---

## Summary

**How it works**:
1. Org signs up → Gets trial, anniversary date set
2. Admin adds card → Subscription created with trial
3. Daily cron (day before anniversary) → Updates subscription quantity
4. Stripe automatically charges on anniversary date
5. Webhooks update status in database

**Key Points**:
- ✅ Fully automatic (no manual intervention needed)
- ✅ Accurate (counts only active students)
- ✅ Safe (only bills active orgs with payment methods)
- ✅ Reliable (error handling and logging)

---

**Last Updated**: 2025-11-25

