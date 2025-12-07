# Complete Sign-Up & Onboarding Flow

This document details the complete process from demo booking to active organization usage.

---

## Overview

**Flow**: Demo Booking → Lead Conversion → Organization Setup → Admin Signup → Payment Setup → Active Usage

---

## Step-by-Step Process

### 1. **Demo Booking** 📅

**What happens:**
- Potential customer books a demo via Calendly (integrated in Leads page)
- Demo booking creates a `LeadActivity` record with type `DEMO_BOOKED`
- Lead status may be updated to `CONTACTED` if it was `NEW`
- Owner/partner conducts the demo call

**Code Location:**
- Lead detail page: `src/components/view-lead-modal.tsx` (Book Demo button)
- Calendly integration uses `ownerCalendlyUrl` from `platform_settings`

**Database Changes:**
- `LeadActivity` record created:
  - `type: 'DEMO_BOOKED'`
  - `description: "Demo booked for [date]"`

---

### 2. **Lead Conversion** 🏢

**What happens:**
- Owner/partner decides to convert the lead after successful demo
- Clicks "Convert to Organisation" button on Lead Detail page
- Modal prompts for admin email address
- System creates organization and sends onboarding email

**Code Location:**
- `src/components/convert-lead-modal.tsx` (UI)
- `src/app/api/owner/leads/[id]/convert/route.ts` (API)

**Detailed Process:**

1. **Organization Creation:**
   ```typescript
   - Creates `Org` record with:
     * name: from lead.orgName
     * slug: auto-generated (e.g., "masjid-falah")
     * city: from lead.city
     * email: admin email provided
     * phone: from lead.contactPhone (if available)
     * status: 'ACTIVE'
   ```

2. **Invitation Creation:**
   ```typescript
   - Creates `Invitation` record:
     * orgId: new organization ID
     * email: admin email provided
     * role: 'ADMIN'
     * token: 32-byte random hex string
     * expiresAt: 7 days from now
   ```

3. **Email Sent:**
   - Sends onboarding email via `sendOrgSetupInvitation()`
   - Email contains signup link: `/auth/signup?token=[token]`
   - Subject: "Set up [Org Name] on Madrasah OS"

4. **Lead Updated:**
   ```typescript
   - Updates `Lead`:
     * convertedOrgId: new organization ID
     * status: 'WON'
   ```

5. **Activity Logged:**
   ```typescript
   - Creates `LeadActivity`:
     * type: 'STATUS_CHANGE'
     * description: "Lead converted to organisation: [name] ([slug])"
   ```

**Database Records Created:**
- 1x `Org` record
- 1x `Invitation` record
- 1x `LeadActivity` record
- `Lead` record updated

**Email Sent:**
- Onboarding invitation email to admin

---

### 3. **Admin Signup** 👤

**What happens:**
- Admin receives email with signup link
- Clicks link → redirected to `/auth/signup?token=[token]`
- Fills out signup form with:
  - Name
  - Email (must match invitation)
  - Password
  - Phone (optional)
  - **Organization details** (if new org setup):
    - Address Line 1
    - Postcode
    - City
    - Contact Phone
    - Public Phone
    - Contact Email
    - Public Email
    - Website (optional)
    - Timezone

**Code Location:**
- `src/app/auth/signup/page.tsx` (UI)
- `src/app/api/auth/signup/route.ts` (API)

**Detailed Process:**

1. **Token Validation:**
   ```typescript
   - Validates invitation token exists
   - Checks token hasn't expired (7 days)
   - Checks invitation hasn't been accepted
   - Verifies email matches invitation (if invitation has email)
   - Ensures user doesn't already exist
   ```

2. **User Creation:**
   ```typescript
   - Creates `User` record:
     * email: from form
     * name: from form
     * password: bcrypt hashed (12 rounds)
     * phone: from form (optional)
     * isSuperAdmin: false
   ```

3. **Organization Details Update** (if new org setup):
   ```typescript
   - Updates `Org` record with:
     * addressLine1: from form
     * postcode: from form
     * city: from form
     * phone: from form
     * publicPhone: from form
     * email: from form
     * publicEmail: from form
     * website: from form (optional)
     * timezone: from form (default: 'Europe/London')
   ```

4. **Membership Creation:**
   ```typescript
   - Creates `UserOrgMembership`:
     * userId: new user ID
     * orgId: organization ID from invitation
     * role: 'ADMIN' (from invitation)
   ```

5. **Invitation Marked Accepted:**
   ```typescript
   - Updates `Invitation`:
     * acceptedAt: current timestamp
   ```

6. **Confirmation Email Sent:**
   - Sends `sendOrgSetupConfirmation()` email
   - Contains dashboard link: `/dashboard`

**Database Records Created:**
- 1x `User` record
- 1x `UserOrgMembership` record
- `Org` record updated (with full details)
- `Invitation` record updated (acceptedAt set)

**Emails Sent:**
- Organization setup confirmation email

**What Admin Can Do Now:**
- Log in to dashboard
- Access organization settings
- **BUT**: Cannot add students/staff/attendance yet (payment required)

---

### 4. **Payment Setup** 💳

**What happens:**
- Admin logs in and tries to add students/staff/attendance
- System checks for payment method via `checkPaymentMethod()`
- If no payment method → Payment gate blocks data entry
- Admin must add payment card in Settings → Platform Payment

**Code Location:**
- `src/lib/payment-check.ts` (payment gate check)
- `src/lib/stripe.ts` → `createPlatformSetupIntent()` (card setup)
- `src/app/api/webhooks/stripe/route.ts` → `handleSetupIntentSucceeded()` (webhook handler)

**Detailed Process:**

1. **Admin Clicks "Add Payment Method":**
   ```typescript
   - Calls `/api/stripe/setup-intent` (platform billing)
   - Creates Stripe Setup Intent
   - Returns client secret for Stripe Elements
   ```

2. **Card Added via Stripe Elements:**
   - Admin enters card details in UI
   - Stripe Elements handles secure card input
   - Card is tokenized (never touches your server)

3. **Stripe Webhook: `setup_intent.succeeded`:**
   ```typescript
   - Webhook handler receives event
   - Creates/gets Stripe Customer (via ensurePlatformCustomer)
   - Creates PlatformOrgBilling record:
     * orgId: organization ID
     * stripeCustomerId: Stripe customer ID
     * billingAnniversaryDate: day of month org was created (1-31)
     * trialEndDate: 1 month from org creation
     * subscriptionStatus: 'trialing'
     * defaultPaymentMethodId: payment method ID
   ```

4. **Subscription Creation:**
   ```typescript
   - If no subscription exists:
     * Counts active students (currently 0)
     * Creates Stripe subscription:
       - Price: STRIPE_PRICE_ID (£1 per unit)
       - Quantity: 0 (no students yet)
       - Trial End: 1 month from signup
       - Payment Method: card just added
     * Updates PlatformOrgBilling:
       * stripeSubscriptionId: subscription ID
       * stripeSubscriptionItemId: subscription item ID
       * subscriptionStatus: 'trialing'
   ```

**Database Records Created:**
- 1x `PlatformOrgBilling` record (if first time)
- `PlatformOrgBilling` updated with payment method and subscription

**Stripe Records Created:**
- 1x Stripe Customer
- 1x Payment Method (attached to customer)
- 1x Subscription (with trial)

**What Admin Can Do Now:**
- ✅ Add students
- ✅ Add staff/teachers
- ✅ Record attendance
- ✅ Use all features
- ⚠️ Still in trial (no charges for 1 month)

---

### 5. **Active Usage** 🎓

**What happens:**
- Admin can now fully use the platform
- Adds students, classes, staff, records attendance, etc.
- System tracks everything in database

**Monthly Billing Process:**

1. **Daily Cron Job** (`/api/cron/billing`):
   - Runs every day at midnight UTC
   - Finds orgs whose billing anniversary is TOMORROW
   - For each org:
     ```typescript
     - Counts active students (non-archived)
     - Updates Stripe subscription quantity
     - Updates PlatformOrgBilling.lastBilledStudentCount
     ```

2. **Stripe Automatic Charging:**
   - On billing anniversary date, Stripe automatically charges:
     - Amount = `student_count × £1`
     - Uses default payment method
   - Example: 50 students = £50/month

3. **Webhook Updates:**
   - `invoice.payment_succeeded` → Updates subscription status
   - `invoice.payment_failed` → Marks org as `past_due`, may deactivate

**Trial Period:**
- First month: FREE (no charges)
- After trial: Charged monthly on anniversary date
- Billing anniversary = day of month org was created
  - Example: Org created on 15th → Billed on 15th each month

---

## Complete Flow Diagram

```
┌─────────────────┐
│  Demo Booking   │
│  (Calendly)     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Lead Created   │
│  (LeadActivity) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Convert Lead    │
│ (Owner Portal)  │
└────────┬────────┘
         │
         ├─► Creates Org
         ├─► Creates Invitation
         ├─► Sends Email
         └─► Updates Lead (WON)
         │
         ▼
┌─────────────────┐
│ Admin Signup    │
│ (/auth/signup)  │
└────────┬────────┘
         │
         ├─► Creates User
         ├─► Creates Membership (ADMIN)
         ├─► Updates Org Details
         └─► Marks Invitation Accepted
         │
         ▼
┌─────────────────┐
│ Payment Setup   │
│ (Required)      │
└────────┬────────┘
         │
         ├─► Creates PlatformOrgBilling
         ├─► Creates Stripe Customer
         ├─► Saves Payment Method
         └─► Creates Subscription (Trial)
         │
         ▼
┌─────────────────┐
│ Active Usage    │
│ (Full Access)   │
└────────┬────────┘
         │
         ├─► Add Students
         ├─► Add Staff
         ├─► Record Attendance
         └─► Use All Features
         │
         ▼
┌─────────────────┐
│ Monthly Billing │
│ (Automatic)     │
└─────────────────┘
```

---

## Key Database Tables

### `Org`
- Organization details
- Created during lead conversion
- Updated during admin signup

### `User`
- User account
- Created during admin signup

### `UserOrgMembership`
- Links user to organization
- Role: ADMIN (for initial admin)
- Created during admin signup

### `Invitation`
- Invitation token for signup
- Created during lead conversion
- Marked accepted during signup

### `PlatformOrgBilling`
- Billing information
- Created when payment card is added
- Tracks subscription, trial, anniversary date

### `Lead`
- Original lead record
- Updated with `convertedOrgId` and status `WON`

### `LeadActivity`
- Activity log for leads
- Records demo bookings, conversions, etc.

---

## Important Notes

### Payment Gate
- **Blocks all data entry** until payment method is added
- Checked via `checkPaymentMethod()` function
- Owner accounts bypass this check

### Trial Period
- **1 month free** from organization creation date
- No charges during trial
- Subscription created with trial end date
- After trial, automatic monthly billing begins

### Billing Anniversary
- Set to **day of month** organization was created
- Example: Created on 15th → Billed on 15th each month
- Cron job updates quantity day before anniversary

### Subscription Quantity
- Automatically updated monthly based on active student count
- Only non-archived students count
- Updated via cron job before billing date

---

## Email Flow

1. **Onboarding Invitation** (Lead Conversion):
   - Sent to admin email
   - Contains signup link with token
   - Expires in 7 days

2. **Setup Confirmation** (After Signup):
   - Sent after successful signup
   - Contains dashboard link
   - Confirms organization setup complete

---

## Security & Validation

### Token Security
- 32-byte random hex tokens
- Expires after 7 days
- Single-use (marked accepted after use)
- Email must match invitation

### Payment Security
- Card details never touch your server
- Stripe Elements handles all card input
- PCI compliant by default
- Payment methods stored securely in Stripe

### Access Control
- Only invited email can signup
- Admin role assigned from invitation
- Payment required before data entry
- Owner accounts have full access

---

## Troubleshooting

### Admin Can't Sign Up
- Check invitation token is valid
- Verify token hasn't expired (7 days)
- Ensure email matches invitation
- Check user doesn't already exist

### Payment Not Working
- Verify Stripe keys are configured
- Check webhook endpoint is set up
- Verify webhook events are being received
- Check PlatformOrgBilling record exists

### Billing Issues
- Verify billing anniversary date is set
- Check subscription exists in Stripe
- Verify cron job is running
- Check student count is accurate

---

**Last Updated**: 2025-12-05



