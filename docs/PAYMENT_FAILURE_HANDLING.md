# Payment Failure Handling - What Happens When Organizations Can't Pay

This document explains the complete flow of what happens when an organization's payment fails.

---

## Overview

When an organization's payment fails, the system has a **grace period** (default: 14 days) before taking action. The system is designed to be forgiving but will eventually suspend accounts that don't pay.

---

## The Payment Failure Flow

### Step 1: **Stripe Attempts Payment** (Automatic)

On the organization's billing anniversary date:
- Stripe automatically attempts to charge the card on file
- If payment succeeds → Nothing happens, org continues normally
- If payment fails → Stripe sends webhook to your system

**Code Location**: Stripe handles this automatically

---

### Step 2: **Webhook Received - Immediate Response** (Within seconds)

When Stripe sends `invoice.payment_failed` webhook:

**What Happens**:
1. **Subscription Status Updated**: 
   - `subscriptionStatus` → `past_due` in database
   - Org can still use the system (grace period)

2. **Email Notification Sent**:
   - Email sent to organization owner/admin
   - Subject: "Payment Failed - [Org Name]"
   - Contains: Failure reason, amount, link to update payment method

3. **Audit Log Created**:
   - Action: `PLATFORM_BILLING_FAILED`
   - Records: Invoice ID, amount, failure reason

**Code Location**: `src/app/api/webhooks/stripe/route.ts` → `handleInvoicePaymentFailed()`

**Timeline**: Happens within seconds of payment failure

---

### Step 3: **Grace Period** (Default: 14 days)

During the grace period:
- ✅ **Org can still use the system** (status remains `ACTIVE`)
- ✅ **All features work normally**
- ⚠️ **Subscription status is `past_due`**
- 📧 **Owner receives email notifications**

**Grace Period Settings**:
- Default: 14 days
- Configurable in platform settings (`gracePeriodDays`)
- Can be changed by super admin

**Purpose**: Gives org time to:
- Update payment method
- Fix card issues
- Contact support

---

### Step 4: **Daily Overdue Check** (Every day at midnight UTC)

A cron job runs daily: `/api/cron/check-overdue`

**What it checks**:
1. Organizations with `past_due` status
2. Organizations past their billing anniversary + grace period
3. Only processes orgs with `autoSuspendEnabled: true`

**What it does**:
- Calculates days overdue
- If overdue > grace period → **Deactivates organization**

**Code Location**: `src/app/api/cron/check-overdue/route.ts`

---

### Step 5: **Account Deactivation** (After grace period)

When grace period is exceeded:

**What Happens**:
1. **Organization Status**:
   - `status` → `DEACTIVATED`
   - `deactivatedAt` → Current timestamp
   - `deactivatedReason` → "Account automatically deactivated due to overdue payment..."

2. **Subscription Status**:
   - `subscriptionStatus` → `past_due` (already set)

3. **Access Blocked**:
   - ❌ Org members **cannot log in**
   - ❌ All features **disabled**
   - ❌ Data is **preserved** (not deleted)

4. **Audit Log**:
   - Action: `ORG_AUTO_DEACTIVATED_OVERDUE`
   - Records: Days overdue, grace period, last billed date

**Code Location**: `src/app/api/cron/check-overdue/route.ts` (lines 127-168)

---

## Example Timeline

### Scenario: Payment fails on Feb 15

```
Day 0 (Feb 15): Payment fails
  → Stripe webhook received
  → Subscription status: past_due
  → Email sent to owner
  → Org still active (grace period starts)

Day 1-13: Grace period
  → Org can still use system
  → Owner receives reminders (if configured)
  → Owner can update payment method

Day 14 (Mar 1): Grace period ends
  → Overdue check cron runs
  → Calculates: 14 days overdue
  → Deactivates organization
  → Status: DEACTIVATED
  → Access blocked

Day 15+: Account deactivated
  → Org cannot log in
  → Data preserved
  → Can be reactivated after payment
```

---

## Recovery: How Organizations Can Fix It

### Option 1: **Update Payment Method** (During grace period)

1. Owner logs in
2. Goes to Settings → Platform Payment
3. Updates payment method
4. Clicks "Pay Overdue Amount"
5. Payment succeeds → Account reactivated immediately

**Code Location**: `src/app/api/platform-billing/pay-overdue/route.ts`

### Option 2: **Pay Overdue After Deactivation**

1. Owner contacts support
2. Support reactivates account (if payment succeeds)
3. Or owner can use "Pay Overdue" button (if still accessible)

**What happens when payment succeeds**:
- Subscription status → `active`
- Org status → `ACTIVE` (if was deactivated)
- `paymentFailureCount` → 0
- `lastPaymentDate` → Updated
- Access restored immediately

**Code Location**: `src/app/api/webhooks/stripe/route.ts` → `handleInvoicePaymentSucceeded()`

---

## Configuration Options

### Grace Period

**Setting**: `gracePeriodDays` in platform settings  
**Default**: 14 days  
**Location**: `PlatformSettings` table

**How to change**:
```typescript
// In platform settings
gracePeriodDays: 14 // Change this value
```

### Auto-Suspend

**Setting**: `autoSuspendEnabled` per organization  
**Default**: `true`  
**Location**: `Org` table

**What it does**:
- If `true`: Org will be auto-deactivated after grace period
- If `false`: Org won't be auto-deactivated (manual intervention required)

---

## Safety Mechanisms

### 1. **Only Active Orgs Are Checked**

The overdue cron only processes:
- Organizations with `status: 'ACTIVE'`
- Organizations with `autoSuspendEnabled: true`
- Organizations with payment method on file

**Why**: Prevents double-processing and respects manual suspensions

### 2. **Data Preservation**

When org is deactivated:
- ✅ **All data is preserved**
- ✅ **Students, classes, invoices remain**
- ✅ **Can be reactivated anytime**
- ❌ **Only access is blocked**

### 3. **Audit Trail**

Every action is logged:
- Payment failures
- Status changes
- Deactivation reasons
- Reactivation events

**Location**: `AuditLog` table

### 4. **Email Notifications**

Owners are notified:
- When payment fails (immediate)
- Before grace period ends (if configured)
- When account is deactivated (if configured)

---

## Monitoring & Alerts

### What to Monitor

1. **Payment Failure Rate**:
   - Check Stripe Dashboard → Invoices → Failed
   - Monitor webhook events

2. **Overdue Organizations**:
   - Check `/api/cron/check-overdue` (GET endpoint)
   - See which orgs are approaching grace period

3. **Deactivated Accounts**:
   - Query: `Org.status = 'DEACTIVATED'`
   - Check `deactivatedReason` for payment-related

### Recommended Alerts

1. **High Failure Rate**: Alert if > 5% of payments fail
2. **Approaching Grace Period**: Alert when org is 10+ days overdue
3. **Deactivation**: Alert when org is auto-deactivated

---

## Manual Intervention

### Owner Portal Actions

Owners can:
- View overdue status in Settings
- Update payment method
- Pay overdue amount
- Contact support

### Super Admin Actions

Super admins can:
- View all overdue orgs in Owner Portal
- Manually reactivate accounts
- Adjust grace period per org
- Disable auto-suspend for specific orgs
- View payment failure history

**Code Location**: `src/app/(owner)/owner/dunning/page.tsx`

---

## Testing Payment Failures

### Test with Stripe Test Cards

1. **Use test card that fails**:
   - Card: `4000 0000 0000 0002` (declined)
   - Card: `4000 0000 0000 9995` (insufficient funds)

2. **Trigger billing**:
   - Set org's billing anniversary to today
   - Run billing cron manually
   - Wait for payment to fail

3. **Verify**:
   - Check subscription status → `past_due`
   - Check email sent
   - Check audit log

### Test Grace Period

1. **Set short grace period** (for testing):
   ```typescript
   // In platform settings
   gracePeriodDays: 1 // 1 day for testing
   ```

2. **Wait for grace period**:
   - Payment fails on Day 0
   - Wait 1 day
   - Run overdue check cron
   - Verify org is deactivated

---

## Summary

**Payment Failure Flow**:
1. Stripe attempts payment → Fails
2. Webhook received → Status `past_due`, email sent
3. Grace period (14 days) → Org can still use system
4. Daily check → Calculates days overdue
5. After grace period → Org deactivated
6. Recovery → Update payment method, pay overdue, reactivated

**Key Points**:
- ✅ Grace period gives orgs time to fix issues
- ✅ Data is always preserved
- ✅ Automatic but configurable
- ✅ Full audit trail
- ✅ Email notifications

**Default Settings**:
- Grace period: 14 days
- Auto-suspend: Enabled
- Email notifications: Enabled

---

**Last Updated**: 2025-11-25

