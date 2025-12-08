# Complete User Flow: From Organisation Creation to Parent Login

## Overview
This document traces the complete flow from when an organisation is created (from a lead) all the way through to when a parent account is logged in and active.

---

## Phase 1: Organisation Creation & Admin Setup

### Step 1: Owner Converts Lead to Organisation
**Location:** `/api/owner/leads/[id]/convert`

**What Happens:**
1. Owner (super admin) clicks "Convert to Organisation" on a lead
2. Owner provides admin email address
3. System creates:
   - `Org` record with:
     - `name`: From lead
     - `slug`: Generated from org name (unique)
     - `city`: From lead
     - `email`: Admin email provided
     - `phone`: From lead (if available)
     - `status`: 'ACTIVE'
   - `Invitation` record with:
     - `orgId`: New org ID
     - `email`: Admin email
     - `role`: 'ADMIN'
     - `token`: Random 32-byte hex token
     - `expiresAt`: 7 days from now
4. Email sent via `sendOrgSetupInvitation()`:
   - Subject: "Set up [Org Name] on Madrasah OS"
   - Contains signup link: `/auth/signup?token=[token]`
5. Lead updated:
   - `convertedOrgId`: Set to new org ID
   - `status`: Changed to 'WON'
6. Activity logged in `LeadActivity`

**Database Records Created:**
- 1x `Org`
- 1x `Invitation`
- 1x `LeadActivity`
- `Lead` record updated

---

### Step 2: Admin Receives Email & Clicks Signup Link
**Location:** `/auth/signup?token=[token]`

**What Happens:**
1. Admin receives email with signup link
2. Clicks link → Redirected to `/auth/signup?token=[token]`
3. Page fetches invitation details via `/api/auth/invitation?token=[token]`
4. Form displays:
   - Admin account fields (name, email, password, phone)
   - Organisation details fields (if new org setup):
     - Address Line 1, Address Line 2
     - City, Postcode
     - Contact Phone, Public Phone
     - Contact Email, Public Email
     - Office Hours
     - Timezone

---

### Step 3: Admin Completes Signup
**Location:** `/api/auth/signup` (POST)

**What Happens:**
1. Admin fills form and submits
2. System validates:
   - Token exists and not expired
   - Email matches invitation (if invitation has email)
   - Password meets requirements (min 8 chars)
   - All required org fields (if new org setup)
3. Transaction creates:
   - `User` record:
     - `email`: From form
     - `name`: From form
     - `password`: bcrypt hashed (12 rounds)
     - `phone`: From form (optional)
     - `isSuperAdmin`: false
   - `UserOrgMembership` record:
     - `userId`: New user ID
     - `orgId`: From invitation
     - `role`: 'ADMIN'
     - `isInitialAdmin`: true (if this is the first admin)
   - `Org` record updated (if new org setup):
     - `addressLine1`, `address`, `city`, `postcode`
     - `phone`, `publicPhone`
     - `email`, `publicEmail`
     - `officeHours`, `timezone`
   - `Invitation` record updated:
     - `acceptedAt`: Current timestamp
4. Confirmation email sent via `sendOrgSetupConfirmation()`
5. Response returns success

**Database Records Created/Updated:**
- 1x `User`
- 1x `UserOrgMembership` (ADMIN, isInitialAdmin: true)
- `Org` updated with details
- `Invitation` marked as accepted

---

### Step 4: Admin Redirected to Onboarding (First Time Only)
**Location:** `/onboarding`

**What Happens:**
1. After signup, admin signs in
2. System checks in `(staff)/layout.tsx`:
   - Is user ADMIN?
   - Is user `isInitialAdmin`?
   - Is onboarding complete? (checks required fields)
3. If incomplete → Redirects to `/onboarding`
4. Onboarding wizard collects:
   - **Step 1: Admin Details**
     - Name, Email, Phone
   - **Step 2: Organisation Details**
     - Address Line 1, Address Line 2
     - City, Postcode
     - Contact Phone, Public Phone
     - Contact Email, Public Email
     - Office Hours
   - **Step 3: Payment Methods**
     - Card Payments (requires Stripe Connect)
     - Cash Payments
     - Bank Transfer
     - Billing Day (1-28)
     - Bank details (if bank transfer enabled)
     - Payment Instructions
   - **Step 4: Review & Complete**
5. Each step saves via `/api/onboarding` (PUT)
6. On completion, all data saved to `Org` and `User` records
7. Admin redirected to `/dashboard`

**Database Records Updated:**
- `User` (admin details)
- `Org` (all organisation and payment settings)

---

### Step 5: Admin Sets Up Platform Payment (Required)
**Location:** Platform billing setup (separate from parent payments)

**What Happens:**
1. Admin must add payment card for platform subscription
2. Creates `PlatformOrgBilling` record
3. Creates Stripe Customer
4. Saves payment method
5. Creates Stripe Subscription (1-month trial)

**Note:** This is separate from parent payment methods setup in onboarding.

---

## Phase 2: Student & Parent Creation

### Step 6: Admin Adds Student
**Location:** `/api/students/create-with-invite` (POST)

**What Happens:**
1. Admin navigates to Students page
2. Clicks "Add Student"
3. Fills form:
   - Student details (name, DOB, gender, etc.)
   - Parent email
   - Class selection
4. System creates:
   - `Student` record:
     - `firstName`, `lastName`
     - `dateOfBirth`
     - `gender`
     - `orgId`: Current org
     - `primaryParentId`: Set after parent created
   - `User` record (if parent email doesn't exist):
     - `email`: Parent email
     - `name`: From form (if provided)
     - `isSuperAdmin`: false
   - `UserOrgMembership` record (if new parent):
     - `userId`: Parent user ID
     - `orgId`: Current org
     - `role`: 'PARENT'
   - `StudentClass` record:
     - Links student to selected class
   - `ParentInvitation` record:
     - `orgId`: Current org
     - `studentId`: New student ID
     - `parentEmail`: Parent email
     - `token`: Random 32-byte hex token
     - `expiresAt`: 7 days from now
5. Student linked to parent (`Student.primaryParentId`)
6. Email sent via `sendParentOnboardingEmail()`:
   - Subject: "Set up your account for [Student Name]"
   - Contains setup link: `/auth/parent-setup?token=[token]`

**Database Records Created:**
- 1x `Student`
- 1x `User` (parent, if new)
- 1x `UserOrgMembership` (PARENT, if new parent)
- 1x `StudentClass`
- 1x `ParentInvitation`

**Alternative Methods:**
- **Bulk Upload:** `/api/students/bulk-upload/confirm` - Creates multiple students and parents at once
- **Application Acceptance:** `/api/applications/[id]` - Accepts application and creates student + parent invitation

---

### Step 7: Parent Receives Email & Clicks Setup Link
**Location:** `/auth/parent-setup?token=[token]`

**What Happens:**
1. Parent receives email with setup link
2. Clicks link → Redirected to `/auth/parent-setup?token=[token]`
3. Page fetches invitation details via `/api/auth/parent-invitation?token=[token]`
4. Form displays:
   - Parent account fields (name, email, password, phone, title, address, postcode)
   - Student information (read-only)
   - Payment method selection:
     - Card (Automatic) - if org accepts card payments
     - Bank Transfer - if org accepts bank transfers
     - Cash - if org accepts cash
   - Gift Aid declaration

---

### Step 8: Parent Completes Account Setup
**Location:** `/api/auth/parent-setup` (POST)

**What Happens:**
1. Parent fills form and submits
2. System validates:
   - Token exists and not expired
   - Email matches invitation
   - Password meets requirements
   - Payment method is valid for org
3. Transaction creates/updates:
   - `User` record (parent):
     - `email`: From invitation
     - `name`: From form
     - `password`: bcrypt hashed
     - `phone`: From form
     - `title`: From form
     - `address`, `postcode`: From form
     - `giftAidStatus`: From form
   - `UserOrgMembership` record (if doesn't exist):
     - `userId`: Parent user ID
     - `orgId`: From invitation
     - `role`: 'PARENT'
   - `Student` record updated:
     - `primaryParentId`: Set to parent user ID
   - `ParentBillingProfile` record:
     - `orgId`: From invitation
     - `parentUserId`: Parent user ID
     - `autoPayEnabled`: true (if card payment selected)
     - `preferredPaymentMethod`: From form
   - `ParentInvitation` record updated:
     - `acceptedAt`: Current timestamp
4. If card payment selected:
   - Redirects to `/parent/payment-methods?setup=true`
   - Parent sets up Stripe payment method
5. Response returns success

**Database Records Created/Updated:**
- `User` (parent) - created or updated
- `UserOrgMembership` (PARENT) - created if new
- `Student.primaryParentId` - updated
- 1x `ParentBillingProfile`
- `ParentInvitation` marked as accepted

---

### Step 9: Parent Sets Up Payment Method (If Card Selected)
**Location:** `/parent/payment-methods?setup=true`

**What Happens:**
1. If parent selected "Card (Automatic)" payment:
   - Redirected to payment methods page
   - Creates Stripe Customer under org's Connect account
   - Creates SetupIntent
   - Parent enters card details
   - Saves payment method
2. `ParentBillingProfile` updated:
   - `stripeCustomerId`: Stripe customer ID
   - `defaultPaymentMethodId`: Saved payment method ID
   - `autoPayEnabled`: true

**Database Records Updated:**
- `ParentBillingProfile` (Stripe details)

---

### Step 10: Parent Logs In
**Location:** `/auth/signin`

**What Happens:**
1. Parent navigates to sign in page
2. Enters email and password
3. System authenticates via NextAuth
4. Session created with:
   - `user.id`: Parent user ID
   - `user.email`: Parent email
   - `user.roleHints.isParent`: true
   - `user.roleHints.orgParentOf`: Array of org IDs
5. Redirected via `getPostLoginRedirect()`:
   - Parent → `/parent/dashboard`
6. Parent can now:
   - View children's information
   - See attendance records
   - View payment history
   - Make payments
   - Receive messages
   - View calendar events

**Session Data:**
- User authenticated
- Role: PARENT
- Access to parent portal

---

## Complete Flow Summary

```
1. Owner converts lead → Org created + Admin invitation sent
2. Admin receives email → Clicks signup link
3. Admin signs up → User + UserOrgMembership (ADMIN) created
4. Admin redirected to onboarding → Completes org setup
5. Admin adds student → Student + ParentInvitation created
6. Parent receives email → Clicks setup link
7. Parent sets up account → User (PARENT) + ParentBillingProfile created
8. Parent sets up payment (if card) → Stripe customer + payment method saved
9. Parent logs in → Session created → Redirected to /parent/dashboard
```

---

## Key Database Models

### Core Models
- **Org**: Organisation details
- **User**: All users (admins, staff, parents)
- **UserOrgMembership**: Links users to orgs with roles
- **Student**: Student records
- **Invitation**: Admin invitations
- **ParentInvitation**: Parent invitations
- **ParentBillingProfile**: Parent payment settings

### Relationships
- `User` ↔ `UserOrgMembership` ↔ `Org` (many-to-many)
- `Student.primaryParentId` → `User.id` (parent)
- `Student` ↔ `StudentClass` ↔ `Class` (many-to-many)
- `ParentBillingProfile` links `Org` + `User` (parent)

---

## Important Notes

1. **Initial Admin**: First admin has `isInitialAdmin: true` and sees onboarding wizard
2. **Payment Methods**: Org must set up payment methods in onboarding before parents can select them
3. **Stripe Connect**: Card payments require org to connect Stripe account first
4. **Invitation Expiry**: All invitations expire after 7 days
5. **Email Delivery**: Uses Resend for all email notifications
6. **Password Security**: All passwords bcrypt hashed with 12 rounds


