# Madrasah OS - Complete Application Documentation

## Overview

**Madrasah OS** is a production-ready, multi-tenant SaaS platform for Islamic schools and madrasahs. It provides comprehensive management tools for staff, parents, and platform owners to manage students, classes, attendance, payments, communications, and more.

**Tech Stack:**
- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js (Credentials provider)
- **Payments**: Stripe (platform billing + parent payments)
- **Email**: Resend
- **Messaging**: WhatsApp Cloud API
- **Storage**: Vercel Blob
- **Hosting**: Vercel

---

## Account Types & Roles

### 1. **OWNER (SuperAdmin)**
- **Access**: Full platform access across all organisations
- **Identifier**: `isSuperAdmin: true` in User model
- **Portal**: `/owner/*` routes
- **Capabilities**: 
  - Manage all organisations
  - View platform-wide analytics and revenue
  - Manage leads and convert to organisations
  - System health monitoring
  - Global support ticket management
  - User management across platform
  - Bypass payment gates

### 2. **ADMIN (Organisation Admin)**
- **Access**: Full access to their organisation
- **Identifier**: `UserOrgMembership.role = 'ADMIN'` and `isInitialAdmin: true`
- **Portal**: `/dashboard` (Staff portal)
- **Capabilities**:
  - All staff features + organisation settings
  - Staff management
  - Payment method setup (required before data entry)
  - Full CRUD on all org data

### 3. **STAFF (Teachers/Finance Officers)**
- **Access**: Limited by permissions
- **Identifier**: `UserOrgMembership.role = 'STAFF'` with `staffSubrole`
- **Subroles**:
  - **ADMIN**: Full access (same as ADMIN role)
  - **TEACHER**: Can view classes, mark attendance, send messages, view calendar
  - **FINANCE_OFFICER**: Financial data access (invoices, payments, fees)
- **Portal**: `/dashboard` (Staff portal)
- **Permissions**: Granular permission system via `StaffPermission` and `StaffPermissionAssignment` tables

### 4. **PARENT**
- **Access**: View-only for their children's data
- **Identifier**: `UserOrgMembership.role = 'PARENT'`
- **Portal**: `/parent/*` routes
- **Capabilities**:
  - View children's attendance, invoices, calendar
  - Pay invoices online via Stripe
  - View announcements
  - Create support tickets
  - Manage gift aid status

---

## Multi-Tenancy Architecture

### Organisation Scoping
- All business data has `orgId` field
- Data is isolated per organisation
- Users can belong to multiple organisations via `UserOrgMembership`
- Active organisation determined by session/cookie

### Portal Routing
- **Production**: Host-based routing (app.madrasah.io, parent.madrasah.io)
- **Development**: Query param routing (`?portal=app`, `?portal=parent`)
- Middleware redirects users to correct portal based on role

### Data Access Control
- All API routes check `requireOrg()` to ensure org context
- All queries filter by `orgId`
- Owner accounts bypass org checks

---

## Database Models (Prisma Schema)

### Core Models

**User**
- Basic user info (name, email, phone, password)
- `isSuperAdmin` flag for owners
- Gift aid fields (`giftAidStatus`, `giftAidDeclaredAt`)
- 2FA fields (`twoFactorEnabled`, `twoFactorCode`)
- Account lockout fields (`failedLoginAttempts`, `lockedUntil`)

**Org**
- Organisation details (name, slug, address, contact info)
- Status: `ACTIVE`, `PAUSED`, `DEACTIVATED`, `SUSPENDED`
- Payment settings (Stripe, payment methods)
- Timezone, settings JSON

**UserOrgMembership**
- Links users to organisations
- Role: `ADMIN`, `STAFF`, `PARENT`
- `staffSubrole`: `ADMIN`, `TEACHER`, `FINANCE_OFFICER`
- `isInitialAdmin`: First admin of org
- Permissions via `StaffPermissionAssignment`

**Student**
- Student info (firstName, lastName, dob, allergies, medicalNotes)
- `primaryParentId` links to parent User
- `isArchived` for soft deletion

**Class**
- Class details (name, description, schedule JSON)
- `teacherId` links to User
- `monthlyFeeP` (fee in pence)
- `isArchived` for soft deletion

**StudentClass**
- Enrollment relationship (student ↔ class)
- Unique constraint on `[studentId, classId]`

**Attendance**
- Daily attendance records
- Status: `PRESENT`, `LATE`, `ABSENT`
- Unique constraint on `[classId, studentId, date]`

**Invoice**
- Student invoices
- Status: `DRAFT`, `PENDING`, `PAID`, `OVERDUE`
- `amountP` (amount in pence)
- `paidAt`, `paidMethod`

**Payment**
- Payment records linked to invoices
- Method: `STRIPE`, `CASH`, `BANK_TRANSFER`
- Status: `PENDING`, `SUCCEEDED`, `FAILED`
- `providerId` (Stripe payment intent ID)

**MonthlyPaymentRecord**
- Monthly fee tracking per student/class
- Status: `PENDING`, `PAID`
- Method: `STRIPE`, `CASH`, `BANK_TRANSFER`

**PlatformOrgBilling**
- Platform subscription billing (Stripe)
- `billingAnniversaryDate` (day of month, 1-31)
- `trialEndDate` (1 month from signup)
- `subscriptionStatus`: `trialing`, `active`, `past_due`
- `stripeCustomerId`, `stripeSubscriptionId`

**ParentBillingProfile**
- Parent payment methods (Stripe)
- `defaultPaymentMethodId`
- `autoPayEnabled`
- `preferredPaymentMethod`

**Lead**
- Sales leads for potential organisations
- Status: `NEW`, `CONTACTED`, `WON`, `LOST`, `COLD`
- Email outreach fields: `lastEmailSentAt`, `lastEmailStage`, `emailOutreachCompleted`
- `nextContactAt` for follow-ups
- `convertedOrgId` when converted

**LeadActivity**
- Activity log for leads
- Type: `EMAIL`, `CALL`, `DEMO_BOOKED`, `STATUS_CHANGE`, `NOTE`
- `outcome` field for call outcomes

**Application**
- Student enrollment applications
- Status: `NEW`, `REVIEWED`, `ACCEPTED`, `REJECTED`
- Guardian info, preferred class, children details

**Event**
- Calendar events (classes, holidays, exams, meetings)
- Type: `CLASS`, `HOLIDAY`, `EXAM`, `EVENT`, `MEETING`
- Can be linked to class or student

**Holiday**
- School holidays (date ranges)

**Term**
- Academic terms (date ranges)

**Exam**
- Exam dates linked to classes

**Message**
- Announcements sent to parents
- Audience: `ALL_PARENTS`, `BY_CLASS`, `INDIVIDUAL`
- Channel: `EMAIL`, `WHATSAPP`
- Status: `DRAFT`, `SENT`

**SupportTicket**
- Support tickets (org-scoped or platform-wide)
- Status: `OPEN`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`
- Role: `ADMIN`, `STAFF`, `PARENT`, `OWNER`

**GiftAidSubmission**
- Gift aid claim submissions
- Date ranges, total amounts, CSV exports

**AuditLog**
- System audit trail
- Tracks all user actions
- `action`, `targetType`, `targetId`, `data` JSON

**Invitation**
- User invitation tokens
- For org setup, staff invites, parent invites
- Expires in 7 days

**ParentInvitation**
- Parent account setup invitations
- Linked to student
- Expires in 7-30 days

**FeesPlan**
- Fee plan templates
- Amount, cadence (MONTHLY), active status

**ProgressLog**
- Student progress notes
- Created by staff, visible to parents

**StaffPermission**
- Permission definitions
- Key, name, description, category

**StaffPermissionAssignment**
- Links staff members to permissions
- Granular access control

---

## Portal Pages & Features

### OWNER Portal (`/owner/*`)

#### 1. **Dashboard** (`/owner/overview`)
- **KPIs**: Total Organisations, Total Students, MRR, This Week's New Orgs, Overdue Orgs, Active Users/Staff, Total Leads
- **Charts**: Revenue trend (12 months), New organisations by month, Top organisations by revenue
- **Recent Activity**: Platform-wide activity feed
- **Real Data**: All metrics from database, excludes demo org

#### 2. **Analytics** (`/owner/analytics`)
- **Metrics**: Current MRR, Last Month MRR, Growth %, ARR, Lifetime Value, ARPU
- **Charts**: Organisations by month, Students by month, MRR trend, Active orgs this month, Average students per org
- **Real Data**: All from Prisma aggregations

#### 3. **Leads Dashboard** (`/owner/leads/dashboard`)
- **Stats**: Total leads, by status, by city, conversion rate
- **Today's Follow-ups**: Leads with `nextContactAt <= today`, `status NOT IN (WON, LOST)`
- **Today's Email Tasks**: Leads with `nextContactAt <= today`, `emailOutreachCompleted = false`, `contactEmail` present
- **Recent Activity**: Latest `LeadActivity` entries
- **Actions**: Click row to open lead detail modal

#### 4. **Leads List** (`/owner/leads`)
- **Table**: Org Name, Contact Name, Status, City, Created, Actions
- **Filters**: Status, City, Search
- **Sorting**: By name, status, next follow-up, last contact, creation date
- **Default**: Excludes "WON" status (can toggle "View Won")
- **Actions**: Edit, View, Delete (with confirmation)
- **Responsive**: Mobile shows only Name, Status, Actions

#### 5. **Lead Detail** (`/owner/leads/[id]`)
- **Key Info**: Contact details, location, next/last contact dates
- **Email Outreach Section**:
  - Status chip (Initial, Follow-up 1, Follow-up 2, Final, Complete)
  - Last email info
  - Next follow-up date
  - Primary button (changes based on stage)
  - Opens email composer modal
- **Log Call Button**: Opens call logging modal
- **Actions**: Email, Log Call, Mark Status (dropdown), Follow-up (dropdown), Book Demo, Convert to Org
- **Activity Timeline**: All `LeadActivity` entries
- **Convert to Org**: Prompts for admin email, creates org, sends onboarding email

#### 6. **Organisations** (`/owner/orgs`)
- **Table**: Name, Students, Staff, MRR, Status, Next Billing, Actions
- **Filters**: Status, Search
- **Actions**: View, Pause, Reactivate, Suspend
- **Real Data**: All from database with Stripe integration

#### 7. **Organisation Detail** (`/owner/orgs/[orgId]`)
- **Overview**: Stats, billing info, Stripe subscription status
- **Students**: List of students in org
- **Staff**: List of staff members
- **Actions**: Pause, Reactivate, Suspend org

#### 8. **Revenue** (`/owner/revenue`)
- **Metrics**: MRR, ARR, This Month Collected, Total Revenue, Pending Revenue, Failed Payments
- **Charts**: Monthly Revenue (12 months), Top Revenue Generators
- **Real Data**: From Stripe + internal billing tables

#### 9. **Users** (`/owner/users`)
- **Table**: Name, Email, Role, Organisation, Status, Created, Actions
- **Filters**: Role, Organisation, Search
- **Pagination**: 20 users per page
- **Exclusions**: Demo org users, owner accounts (`isSuperAdmin: true`)
- **Actions**: View, Edit (opens modals)
- **Real Data**: From `users` table, excludes demo org

#### 10. **Students** (`/owner/students`)
- **Table**: Name, Organisation, Classes, Status, Created
- **Filters**: Organisation, Status, Search
- **Real Data**: All students across platform

#### 11. **System Health** (`/owner/system-health`)
- **Overall Status**: Uptime, Error Rate, Active Users
- **Service Status**: Next.js/Vercel, PostgreSQL, Stripe, Resend, Storage, NextAuth.js
- **Performance Metrics**: Response Time, API Latency, Database Query Time, Memory Usage, CPU Usage
- **Security Metrics**: Failed Login Attempts, 2FA Adoption, SSL Certificate Status, Firewall Status
- **Infrastructure**: Total Organisations, Total Users, Total Students, Database Size, Storage Usage
- **Real Data**: From system monitoring, `os` module, Stripe API, Resend API

#### 12. **Dunning** (`/owner/dunning`)
- **Table**: Organisation, Amount Overdue, Days Overdue, Last Charge, Next Action
- **Actions**: Retry Payment, Send Dunning Email
- **Real Data**: From Stripe invoices with `past_due` status

#### 13. **Support** (`/owner/support`)
- **Tickets**: All platform-wide tickets
- **Filters**: Status, Role, Search
- **Actions**: View, Respond, Close

#### 14. **Settings** (`/owner/settings`)
- **Platform Settings**: Maintenance mode, email config, Stripe config, Calendly URL
- **Billing Stats**: Platform-wide billing metrics

---

### STAFF Portal (`/dashboard`, `/classes`, etc.)

#### 1. **Dashboard** (`/dashboard`)
- **KPIs**: Total Students, Total Classes, Attendance Rate, Total Revenue, Pending Invoices, Overdue Invoices
- **Charts**: Attendance Trend (8 weeks), Revenue Trend (12 months)
- **Today's Tasks**: Students needing attention, overdue invoices, upcoming events
- **Recent Activity**: Latest `AuditLog` entries
- **Real Data**: All from database

#### 2. **Classes** (`/classes`)
- **List**: All classes with student counts, teacher, monthly fee
- **Actions**: Create, Edit, View, Archive
- **Class Detail**: Students enrolled, schedule, teacher, fee, attendance stats
- **Features**: Student enrollment, schedule management

#### 3. **Students** (`/students`)
- **List**: All students with class enrollments, parent info
- **Actions**: Create, Edit, View, Archive, Bulk Upload (CSV)
- **Student Detail**: Personal info, classes, attendance, invoices, progress logs
- **Bulk Upload**: CSV import with validation, duplicate detection

#### 4. **Applications** (`/applications`)
- **List**: Student enrollment applications
- **Status**: NEW, REVIEWED, ACCEPTED, REJECTED
- **Actions**: Review, Accept (creates student + parent account + invitation), Reject
- **Accept Flow**: Creates student, finds/creates parent user, creates parent invitation, enrolls in preferred class

#### 5. **Staff** (`/staff`)
- **List**: All staff members with roles and permissions
- **Actions**: Create, Edit, View, Archive
- **Permissions**: Granular permission assignment per staff member
- **Subroles**: ADMIN, TEACHER, FINANCE_OFFICER

#### 6. **Teachers** (`/teachers`)
- **List**: Staff with TEACHER subrole
- **Actions**: Create, Edit, View, Archive
- **Features**: Class assignments, schedule management

#### 7. **Attendance** (`/attendance`)
- **Bulk Marking**: Select class, date, mark all students (PRESENT, LATE, ABSENT)
- **History**: View past attendance by class and date
- **Export**: CSV export of attendance records
- **Features**: Real-time updates, parent notifications (via messages)

#### 8. **Finances** (`/finances`)
- **Overview**: Total revenue, pending, overdue, success rate
- **Charts**: Revenue trends, payment methods breakdown
- **Real Data**: From invoices and payments

#### 9. **Fees** (`/fees`)
- **Fee Plans**: Create and manage fee plan templates
- **Features**: Amount, cadence (MONTHLY), active status

#### 10. **Payments** (`/payments`)
- **List**: All invoices with status, amount, due date, student
- **Filters**: Status, Student, Class, Date range
- **Actions**: Create invoice, Record cash payment, View invoice
- **Manual Payment**: Record cash/bank transfer payments
- **Payment Records**: View all payment records

#### 11. **Gift Aid** (`/gift-aid`)
- **Parent Status**: View all parents' gift aid status (YES, NO, NOT_SURE)
- **Analytics**: Total claimed, active parents, potential value
- **Export**: CSV export for HMRC submission
- **Reminders**: Send reminders to parents who haven't declared

#### 12. **Messages** (`/messages`)
- **List**: All sent announcements
- **Create**: Send to ALL_PARENTS, BY_CLASS, or INDIVIDUAL
- **Channels**: EMAIL (via Resend), WHATSAPP (copy message for manual sending)
- **Features**: Save as draft, show on announcements page

#### 13. **Calendar** (`/calendar`)
- **View**: Month/week view of events
- **Events**: Classes, holidays, terms, exams, meetings
- **Create**: Add events, holidays, terms, exams
- **Export**: ICS file download

#### 14. **Support** (`/support`)
- **Tickets**: Create and manage support tickets
- **Docs**: Comprehensive documentation
- **FAQ**: Frequently asked questions

#### 15. **Settings** (`/settings`)
- **Profile**: User profile settings
- **Organisation**: Org details, contact info, payment methods
- **Platform Payment**: Add Stripe card (required before data entry)
- **Payment Methods**: Manage parent payment methods
- **Subscription**: View platform billing status, trial info

---

### PARENT Portal (`/parent/*`)

#### 1. **Dashboard** (`/parent/dashboard`)
- **Children**: List of children with quick stats
- **Announcements**: Recent messages/announcements
- **Attendance**: Recent attendance records
- **Upcoming Events**: Calendar events
- **Invoices**: Recent invoices with payment status

#### 2. **Children** (`/parent/children`)
- **List**: All children with class enrollments
- **Child Detail**: Personal info, classes, attendance, progress logs

#### 3. **Attendance** (`/parent/attendance`)
- **View**: Attendance records for all children
- **Filters**: By child, by class, by date range
- **Status**: PRESENT, LATE, ABSENT indicators

#### 4. **Payments** (`/parent/payments`)
- **Invoices**: All invoices for children
- **Status**: PENDING, PAID, OVERDUE
- **Actions**: Pay Now (Stripe), View Invoice
- **Payment History**: All payment records
- **Payment Methods**: Add/manage Stripe cards, enable auto-pay

#### 5. **Calendar** (`/parent/calendar`)
- **View**: Month/week view
- **Events**: Classes, holidays, exams, meetings for children's classes
- **Export**: ICS file download

#### 6. **Announcements** (`/parent/announcements`)
- **List**: All messages sent to parent (ALL_PARENTS, BY_CLASS, or INDIVIDUAL)
- **Filters**: By date, by type

#### 7. **Gift Aid** (`/parent/gift-aid`)
- **Status**: Current gift aid status (YES, NO, NOT_SURE)
- **Update**: Change status, declare gift aid
- **Total Amount**: Total payments if status is YES

#### 8. **Support** (`/parent/support`)
- **Tickets**: Create and track support tickets
- **Responses**: View ticket responses

#### 9. **Settings** (`/parent/settings`)
- **Profile**: User profile settings
- **Payment Methods**: Manage Stripe cards
- **Notifications**: Communication preferences

---

## Key Workflows

### 1. **Lead to Organisation Conversion**

1. **Demo Booking**: Lead books demo via Calendly (creates `LeadActivity`)
2. **Lead Conversion**: Owner clicks "Convert to Organisation"
   - Enters admin email
   - Creates `Org` record
   - Creates `Invitation` record (7-day token)
   - Sends onboarding email via Resend
   - Updates lead status to `WON`
3. **Admin Signup**: Admin receives email, clicks link
   - Fills signup form (name, email, password, org details)
   - Creates `User` record
   - Creates `UserOrgMembership` (ADMIN role)
   - Updates `Org` with full details
   - Marks invitation as accepted
4. **Payment Setup**: Admin must add payment card
   - Creates `PlatformOrgBilling` record
   - Creates Stripe Customer
   - Saves payment method
   - Creates Stripe Subscription (with 1-month trial)
5. **Active Usage**: Admin can now add students, classes, etc.

### 2. **Student Enrollment**

**Option A: Application Flow**
1. Parent submits application via `/apply/[orgSlug]`
2. Creates `Application` with `ApplicationChild` records
3. Admin reviews application
4. Admin accepts → Creates `Student`, finds/creates `User` (parent), creates `ParentInvitation`, enrolls in class

**Option B: Direct Creation**
1. Staff creates student via "Add Student" modal
2. Enters student info, parent email, class
3. Creates `Student` record
4. Finds/creates `User` (parent) if email exists
5. Creates `ParentInvitation` (7-day token)
6. Enrolls in class via `StudentClass`
7. Sends parent onboarding email

**Option C: Bulk Upload**
1. Staff uploads CSV file
2. System validates and parses data
3. Shows preview with duplicates/errors
4. Staff confirms import
5. Creates all students, parents, enrollments, invitations

### 3. **Parent Account Setup**

1. Parent receives invitation email
2. Clicks link → `/auth/parent-setup?token=[token]`
3. Fills form: name, email, password, student details, payment method preference
4. Creates/updates `User` record
5. Creates `UserOrgMembership` (PARENT role)
6. Links student to parent (`Student.primaryParentId`)
7. Creates `ParentBillingProfile`
8. Marks invitation as accepted

### 4. **Attendance Marking**

1. Staff navigates to Attendance page
2. Selects class and date
3. System shows all enrolled students
4. Staff marks each student: PRESENT, LATE, or ABSENT
5. Bulk update via API (`POST /api/attendance/bulk`)
6. Creates/updates `Attendance` records
7. Can trigger parent notifications (optional)

### 5. **Invoice Generation & Payment**

**Monthly Invoice Generation:**
1. Staff clicks "Generate Monthly Invoices"
2. System finds all active students
3. For each student:
   - Gets their classes
   - Gets class `monthlyFeeP`
   - Creates `Invoice` for current month
   - Creates `MonthlyPaymentRecord`
4. Invoices appear in Payments page

**Parent Payment:**
1. Parent views invoice in Payments page
2. Clicks "Pay Now"
3. System creates Stripe Payment Intent
4. Parent enters card (if not saved) or uses saved card
5. Stripe processes payment
6. Webhook updates `Invoice.status = PAID`, `Payment.status = SUCCEEDED`
7. Updates `MonthlyPaymentRecord.status = PAID`

**Manual Payment Recording:**
1. Staff records cash/bank transfer payment
2. Updates `Invoice.status = PAID`, `paidMethod = CASH/BANK_TRANSFER`
3. Creates `Payment` record
4. Updates `MonthlyPaymentRecord`

### 6. **Email Outreach (Leads)**

1. Owner views lead detail page
2. Clicks email button (label changes based on `lastEmailStage`)
3. Opens email composer modal
4. Selects template: Initial, Follow-up 1, Follow-up 2, Final, or Custom
5. System pre-fills subject and body with placeholders
6. Owner can edit before sending
7. Clicks "Send Email"
8. API validates (prevents duplicate sends same day)
9. Sends email via Resend
10. Creates `LeadActivity` (type: EMAIL)
11. Updates `Lead`: `lastEmailSentAt`, `lastEmailStage` (increments), `lastContactAt`, `nextContactAt` (+7 days)
12. If stage = FINAL, sets `emailOutreachCompleted = true`

### 7. **Call Logging (Leads)**

1. Owner clicks "Log Call" on lead detail
2. Opens call logging modal
3. Selects outcome: No answer, Busy, Spoke – interested, Spoke – not interested, Asked to call back later, Wrong number
4. Sets date/time (defaults to now)
5. Adds optional notes
6. If "Asked to call back later", sets follow-up date (default +7 days)
7. Saves call
8. Creates `LeadActivity` (type: CALL, with outcome)
9. Updates `Lead.lastContactAt`
10. Conditionally updates `Lead.nextContactAt` and `Lead.status` based on outcome

### 8. **Platform Billing (Automatic)**

1. **Org Signup**: `PlatformOrgBilling` created when card added
   - `billingAnniversaryDate` = day of month org created (1-31)
   - `trialEndDate` = 1 month from creation
   - `subscriptionStatus = 'trialing'`
2. **Daily Cron** (`/api/cron/billing`): Runs at midnight UTC
   - Finds orgs with anniversary TOMORROW
   - Counts active students (non-archived)
   - Updates Stripe subscription quantity
   - Updates `lastBilledStudentCount`
3. **Stripe Automatic Charge**: On anniversary date
   - Charges: `student_count × £1`
   - Uses default payment method
4. **Webhooks**: Update subscription status
   - `invoice.payment_succeeded` → `subscriptionStatus = 'active'`
   - `invoice.payment_failed` → `subscriptionStatus = 'past_due'`, may deactivate org

### 9. **Gift Aid Management**

1. **Parent Declaration**: Parent sets status in portal (YES, NO, NOT_SURE)
2. **Staff Management**: Staff can update parent status
3. **Analytics**: View total claimed, active parents, potential value
4. **Export**: Generate CSV for HMRC submission
   - Includes parent details, payment amounts, dates
   - Only includes parents with status = YES
5. **Reminders**: Send email reminders to undeclared parents

### 10. **Support Tickets**

1. **Create**: User creates ticket (staff/parent/owner)
2. **Assignment**: Tickets are org-scoped (staff/parent) or platform-wide (owner)
3. **Response**: Staff/owner can respond to tickets
4. **Status**: OPEN → IN_PROGRESS → RESOLVED → CLOSED
5. **Notifications**: Email notifications on updates

---

## API Routes

### Authentication
- `POST /api/auth/signin` - Sign in (handles 2FA)
- `POST /api/auth/signup` - Sign up with invitation token
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/invitation?token=...` - Get invitation details
- `POST /api/auth/parent-setup` - Parent account setup
- `GET /api/auth/parent-invitation?token=...` - Get parent invitation

### Students
- `GET /api/students` - List students (org-scoped)
- `POST /api/students` - Create student
- `GET /api/students/[id]` - Get student detail
- `PUT /api/students/[id]` - Update student
- `POST /api/students/[id]/archive` - Archive student
- `GET /api/students/[id]/attendance` - Get student attendance
- `POST /api/students/create-with-invite` - Create student + parent invitation
- `POST /api/students/bulk-upload` - Upload CSV, validate
- `POST /api/students/bulk-upload/confirm` - Confirm CSV import

### Classes
- `GET /api/classes` - List classes
- `POST /api/classes` - Create class
- `GET /api/classes/[id]` - Get class detail
- `PUT /api/classes/[id]` - Update class
- `POST /api/classes/[id]/archive` - Archive class

### Attendance
- `POST /api/attendance/bulk` - Bulk update attendance

### Invoices & Payments
- `GET /api/invoices` - List invoices
- `POST /api/invoices` - Create invoice
- `GET /api/invoices/[id]` - Get invoice
- `POST /api/invoices/[id]/record-cash` - Record cash payment
- `POST /api/invoices/generate-monthly` - Generate monthly invoices
- `GET /api/payments` - List payments
- `POST /api/payments/stripe/pay-now` - Create payment intent
- `POST /api/payments/stripe/setup-intent` - Save payment method
- `POST /api/payments/stripe/autopay-toggle` - Toggle auto-pay
- `POST /api/payments/manual` - Record manual payment

### Messages
- `GET /api/messages` - List messages
- `POST /api/messages/send` - Send announcement

### Calendar
- `GET /api/calendar/ics` - Export ICS file
- `GET /api/staff/calendar` - Get staff calendar events
- `GET /api/parent/calendar` - Get parent calendar events
- `GET /api/events` - List events
- `POST /api/events` - Create event
- `GET /api/holidays` - List holidays
- `POST /api/holidays` - Create holiday

### Applications
- `GET /api/applications` - List applications
- `POST /api/applications` - Create application
- `PATCH /api/applications/[id]` - Update application (accept/reject)

### Gift Aid
- `GET /api/gift-aid` - Get gift aid data (date range)
- `GET /api/gift-aid/analytics` - Get analytics
- `GET /api/gift-aid/parent-status` - Get parent's status
- `POST /api/gift-aid/parent-status` - Update parent's status
- `POST /api/gift-aid/update-status` - Staff updates parent status
- `GET /api/gift-aid/download` - Download CSV
- `POST /api/gift-aid/send-reminders` - Send reminders

### Owner APIs
- `GET /api/owner/dashboard` - Dashboard stats
- `GET /api/owner/analytics` - Analytics data
- `GET /api/owner/revenue` - Revenue data
- `GET /api/owner/leads` - List leads
- `POST /api/owner/leads` - Create lead
- `GET /api/owner/leads/[id]` - Get lead
- `PUT /api/owner/leads/[id]` - Update lead
- `DELETE /api/owner/leads/[id]` - Delete lead
- `POST /api/owner/leads/[id]/send-email` - Send outreach email
- `POST /api/owner/leads/[id]/log-call` - Log call attempt
- `POST /api/owner/leads/[id]/convert` - Convert lead to org
- `GET /api/owner/leads/dashboard/stats` - Lead dashboard stats
- `GET /api/owner/orgs` - List organisations
- `GET /api/owner/orgs/[orgId]` - Get organisation
- `GET /api/owner/users` - List users
- `GET /api/owner/users/[id]` - Get user
- `PUT /api/owner/users/[id]` - Update user
- `GET /api/owner/students` - List all students
- `GET /api/owner/system-health` - System health data

### Webhooks
- `POST /api/webhooks/stripe` - Stripe events (payment, subscription)
- `POST /api/webhooks/whatsapp` - WhatsApp delivery status
- `POST /api/webhooks/payment-success` - Payment success handler
- `POST /api/webhooks/payment-failure` - Payment failure handler

### Cron Jobs
- `POST /api/cron/billing` - Update subscription quantities (daily)
- `POST /api/cron/check-overdue` - Handle payment failures (daily)
- `POST /api/cron/nightly-usage` - Report usage to Stripe (nightly)
- `POST /api/cron/retry-payments` - Retry failed payments

---

## Integrations

### Stripe
- **Platform Billing**: Variable quantity subscriptions (£1/student/month)
- **Parent Payments**: Payment Intents for invoice payments
- **Payment Methods**: Setup Intents for saving cards
- **Webhooks**: Handle payment events, subscription updates
- **Auto-pay**: Off-session payment attempts for saved cards

### Resend
- **Email Sending**: All transactional emails
- **Templates**: HTML email templates with branding
- **Types**: Parent invitations, org setup, password reset, support tickets, lead outreach, payment notifications

### WhatsApp Cloud API
- **Setup**: Embedded Signup flow for business accounts
- **Messaging**: Template messages (currently manual copy-paste)
- **Webhooks**: Delivery status tracking

### Vercel Blob
- **File Storage**: Invoice PDFs, CSV exports
- **Signed URLs**: Secure file access
- **Organisation**: Bucket structure by org

---

## Payment Systems

### Platform Billing (Stripe Subscription)
- **Model**: £1 per student per month
- **Trial**: 1 month free from signup
- **Billing**: Monthly on anniversary date (day of month org created)
- **Process**: 
  1. Card added → Subscription created with trial
  2. Daily cron updates quantity (day before anniversary)
  3. Stripe charges automatically on anniversary
  4. Webhooks update status
- **Payment Gate**: Blocks data entry until card added

### Parent Payments (Stripe Payment Intents)
- **Methods**: Stripe card, Cash, Bank Transfer
- **Auto-pay**: Optional for saved cards
- **Process**:
  1. Parent clicks "Pay Now"
  2. Payment Intent created
  3. Card charged via Stripe Elements
  4. Webhook updates invoice/payment status
- **Manual Recording**: Staff can record cash/bank payments

---

## Security & Authorization

### Authentication
- **NextAuth.js**: Credentials provider
- **Password**: bcrypt hashing (12 rounds)
- **2FA**: Optional, code-based
- **Account Lockout**: 5 failed attempts = 30 min lockout
- **Session**: JWT tokens, 7-day expiry

### Authorization
- **Role-Based**: OWNER, ADMIN, STAFF, PARENT
- **Permission-Based**: Granular permissions for staff
- **Org Scoping**: All data filtered by `orgId`
- **API Middleware**: `requireRole()`, `requireOrg()` helpers

### Payment Security
- **Stripe Elements**: Card details never touch server
- **PCI Compliance**: Handled by Stripe
- **Webhook Verification**: Signature verification

---

## Key Features

### Email Outreach (Leads)
- **Templates**: Initial, Follow-up 1, Follow-up 2, Final, Custom
- **Stages**: Tracks `lastEmailStage` (INITIAL, FOLLOW_UP_1, FOLLOW_UP_2, FINAL)
- **Prevention**: Can't send same template twice to same lead
- **Tracking**: `lastEmailSentAt`, `emailOutreachCompleted`

### Call Logging (Leads)
- **Outcomes**: No answer, Busy, Spoke – interested, Spoke – not interested, Asked to call back later, Wrong number
- **Auto-updates**: Updates `nextContactAt` and `status` based on outcome
- **Activity Log**: Creates `LeadActivity` with outcome

### Bulk Operations
- **Student Import**: CSV upload with validation
- **Attendance**: Bulk marking by class/date
- **Invoice Generation**: Monthly batch creation

### Calendar & Events
- **Types**: Classes, Holidays, Terms, Exams, Events, Meetings
- **ICS Export**: Download calendar files
- **Filtering**: By type, by class, by date range

### Gift Aid
- **Status**: YES, NO, NOT_SURE
- **Tracking**: Parent declarations, payment history
- **Export**: HMRC-compliant CSV
- **Reminders**: Email reminders to undeclared parents

### Support System
- **Tickets**: Org-scoped or platform-wide
- **Roles**: ADMIN, STAFF, PARENT, OWNER
- **Status**: OPEN, IN_PROGRESS, RESOLVED, CLOSED
- **Responses**: Threaded conversations

---

## Database Relationships

- `User` ↔ `UserOrgMembership` ↔ `Org` (many-to-many)
- `Student` → `User` (primaryParentId)
- `Student` ↔ `StudentClass` ↔ `Class` (many-to-many)
- `Class` → `User` (teacherId)
- `Attendance` → `Class`, `Student`, `Org`
- `Invoice` → `Student`, `Org`
- `Payment` → `Invoice`, `Org`
- `Lead` → `User` (assignedToUserId), `Org` (convertedOrgId)
- `LeadActivity` → `Lead`, `User` (createdByUserId)
- `PlatformOrgBilling` → `Org` (one-to-one)
- `ParentBillingProfile` → `Org`, `User` (parentUserId)

---

## Important Business Rules

1. **Payment Gate**: Orgs must add payment card before adding students/staff/attendance
2. **Trial Period**: 1 month free from org creation
3. **Billing**: Only non-archived students count toward billing
4. **Lead Conversion**: Can only convert once, requires admin email
5. **Email Outreach**: Can't send same template twice to same lead
6. **Invitations**: Expire in 7 days (parent invitations: 7-30 days)
7. **Demo Org Exclusion**: "Test Islamic School" excluded from owner stats
8. **Owner Exclusion**: `isSuperAdmin: true` users excluded from users page
9. **Archived Data**: Soft deletion via `isArchived` flag

---

## File Locations

### Key Components
- `src/components/view-lead-modal.tsx` - Lead detail modal
- `src/components/convert-lead-modal.tsx` - Convert lead modal
- `src/components/log-call-modal.tsx` - Call logging modal
- `src/components/lead-email-composer-modal.tsx` - Email composer
- `src/components/view-user-modal.tsx` - User detail modal
- `src/components/edit-user-modal.tsx` - User edit modal

### API Routes
- `src/app/api/owner/leads/*` - Lead management
- `src/app/api/owner/leads/[id]/send-email/route.ts` - Email sending
- `src/app/api/owner/leads/[id]/log-call/route.ts` - Call logging
- `src/app/api/owner/leads/[id]/convert/route.ts` - Lead conversion
- `src/app/api/auth/signup/route.ts` - Admin signup
- `src/lib/stripe.ts` - Stripe integration
- `src/lib/mail.ts` - Email sending (Resend)

### Pages
- `src/app/(owner)/owner/*` - Owner portal pages
- `src/app/(staff)/*` - Staff portal pages
- `src/app/(parent)/parent/*` - Parent portal pages

---

This documentation covers all major features, workflows, and technical details of Madrasah OS. Use this as a reference for understanding the complete system architecture and functionality.

