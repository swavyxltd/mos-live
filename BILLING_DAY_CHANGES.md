# Billing Day Changes - Empty/Null Default

## Summary
Changed billing day to allow empty/null values by default instead of defaulting to 1.

## Changes Made

### 1. Database Schema (`prisma/schema.prisma`)
- Removed `@default(1)` from `billingDay` field
- Removed `@default(1)` from `feeDueDay` field
- Both fields now default to `null`

### 2. Migration Created
- `prisma/migrations/20250101000000_remove_billing_day_defaults/migration.sql`
- Removes default values from database columns

### 3. Core Library (`src/lib/billing-day.ts`)
- `getBillingDay()` now returns `number | null` (was `number`, defaulted to 1)
- `prepareBillingDayUpdate()` allows null to clear billing day
- Returns null when billing day is not set

### 4. UI Components
- **Payment Methods Tab** (`src/components/payment-methods-tab.tsx`):
  - Input field shows placeholder "Not set" when empty
  - Allows clearing billing day (empty value)
  - Handles null values in display
  - Example text only shows when billing day is set

- **Setup Page** (`src/app/(staff)/setup/page.tsx`):
  - Default billing day is now `null`
  - Allows empty billing day during setup
  - Shows "Not set" in review section

### 5. API Endpoints
- **Payment Methods API** (`src/app/api/settings/payment-methods/route.ts`):
  - Accepts null/empty values to clear billing day
  - Returns null when billing day is not set

- **Onboarding API** (`src/app/api/onboarding/route.ts`):
  - Allows null/empty billing day during onboarding
  - Validates only when value is provided

- **Organisation Settings API** (`src/app/api/settings/organisation/route.ts`):
  - Allows null to clear billing day
  - Validates only when value is provided

### 6. Payment Processing
- **Invoice Generation** (`src/app/api/invoices/generate-monthly/route.ts`):
  - Requires billing day to be set (returns error if null)
  - Prevents invoice generation without billing day

- **Payment Status Updates** (`src/app/api/payments/update-statuses/route.ts`):
  - Skips status updates if billing day is null
  - Returns success message indicating skip

- **Bill Parents Cron** (`src/app/api/cron/bill-parents/route.ts`):
  - Skips orgs without billing day set
  - Only processes orgs with valid billing day

### 7. Parent-Facing Pages
- **Parent Payments** (`src/app/(parent)/parent/payments/page.tsx`):
  - Handles null billing day gracefully
  - Shows "Not set" when billing day is null

- **Parent Signup** (`src/app/parent/signup/page.tsx`):
  - Conditional rendering for billing day references
  - Shows "As agreed" or omits date when null

### 8. Public API
- **Public Payment Methods** (`src/app/api/public/payment-methods/route.ts`):
  - Returns null when billing day is not set

## Behavior Changes

### Before
- Billing day defaulted to 1
- Always had a value
- Couldn't be cleared

### After
- Billing day starts as null/empty
- Admins can set (1-28) or leave empty
- Can be cleared by setting to empty
- Features requiring billing day show appropriate messages when null

## Migration Instructions

To apply the database changes:

```bash
# Apply the migration
npx prisma migrate deploy

# Or if using db push
npx prisma db push
```

## Testing

1. **New Organization**: Billing day should be empty/null
2. **Set Billing Day**: Can set to any value 1-28
3. **Clear Billing Day**: Can set to empty to clear
4. **Invoice Generation**: Should require billing day to be set
5. **Payment Status**: Should skip updates when billing day is null
6. **Cron Job**: Should skip orgs without billing day

## Notes

- Existing organizations with billing day = 1 will keep that value
- New organizations will have null billing day
- Organizations can clear their billing day by setting it to empty
- Features that require billing day will show appropriate error messages

