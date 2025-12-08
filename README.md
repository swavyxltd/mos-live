# Madrasah OS

A production-ready, multi-tenant SaaS platform for Islamic schools and madrasahs. Built with Next.js, Prisma, PostgreSQL, and modern web technologies.

## Features

### Staff Portal (app.madrasah.io)
- **Dashboard**: KPIs, charts, and recent activity
- **Classes**: Manage classes, schedules, and student enrollments
- **Students**: Student management with CSV import/export
- **Attendance**: Mark and track student attendance
- **Fees**: Manage fees plans and billing
- **Invoices**: Generate and manage invoices
- **Messages**: Send announcements via email/WhatsApp
- **Calendar**: View classes, holidays, terms, and exams
- **Support**: Internal support ticket system
- **Settings**: Organisation configuration

### Parent Portal (parent.madrasah.io)
- **Dashboard**: Overview of children's progress
- **Invoices**: View and pay invoices online
- **Calendar**: View class schedules and events
- **Support**: Create support tickets

### Owner Portal (SuperAdmin)
- **Overview**: Platform metrics and revenue
- **Organisations**: Manage all organisations
- **Dunning**: Handle billing failures
- **Support**: Global support management

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js (Credentials)
- **Payments**: Stripe (metered billing + card payments)
- **Storage**: Vercel Blob
- **Email**: Resend
- **Messaging**: WhatsApp Cloud API
- **Testing**: Playwright

## Design System

Madrasah OS uses a modern, tweakcn-inspired design system with OKLCH color tokens for consistent theming and accessibility.

### Theme Tokens

The design system uses CSS custom properties with OKLCH color space for better color consistency:

- **Light Mode**: Soft whites, subtle grays, and clean borders
- **Dark Mode**: Dark backgrounds with proper contrast ratios
- **Components**: Rounded corners, subtle shadows, and consistent spacing

### Key Components

- **Card**: `rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-xs)]`
- **StatCard**: Displays metrics with change indicators and descriptions
- **Button**: Multiple variants (primary, secondary, ghost, outline)
- **Table**: Sticky headers, hover states, and subtle row separators
- **Sidebar**: Left navigation with sections and user profile
- **Topbar**: Page title, breadcrumbs, search, and user actions

### Dark Mode

Toggle dark mode by adding the `dark` class to the HTML element:

```html
<html class="dark">
```

### Usage Examples

```tsx
// StatCard with change indicator
<StatCard
  title="Total Students"
  value={150}
  change={{ value: "+12.5%", type: "positive" }}
  description="Trending up this month"
  detail="Enrollment for the last 6 months"
/>

// Wave area chart
<WaveChart
  title="Total Visitors"
  subtitle="Total for the last 3 months"
  data={chartData}
  filterOptions={[
    { label: 'Last 3 months', value: '3m', active: true },
    { label: 'Last 30 days', value: '30d' },
    { label: 'Last 7 days', value: '7d' }
  ]}
/>
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL database
- Stripe account
- Vercel Blob Storage (automatically configured)
- Resend account
- WhatsApp Business API (optional for dev)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <repository-url>
   cd madrasah-os-app
   npm install --legacy-peer-deps
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your actual values
   ```

3. **Set up the database:**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Seed the database:**
   ```bash
   npm run db:seed
   ```

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Access the application:**
   - Staff Portal: http://localhost:3000?portal=app
   - Parent Portal: http://localhost:3000?portal=parent
   - Auth Portal: http://localhost:3000?portal=auth

## Production Deployment

### Pre-Deployment Checklist

Before deploying to production, complete the items in `PRE_LAUNCH_CHECKLIST.md`.

### Deploying to Vercel

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "Prepare for production"
   git push origin main
   ```

2. **Import to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository

3. **Configure Environment Variables:**
   - In Vercel Dashboard → Settings → Environment Variables
   - Add all required variables (see `DEPLOYMENT.md` for full list)
   - **Critical variables:**
     - `NEXTAUTH_URL` - Your production URL
     - `NEXTAUTH_SECRET` - Generate with `openssl rand -base64 32`
     - `DATABASE_URL` or `POSTGRES_PRISMA_URL` - Production database
     - `STRIPE_SECRET_KEY` - Production key (starts with `sk_live_`)
     - `STRIPE_WEBHOOK_SECRET` - From Stripe Dashboard

4. **Set up Vercel Postgres:**
   - In Vercel Dashboard → Storage → Create Database → Postgres
   - Copy the `POSTGRES_PRISMA_URL` to environment variables

5. **Set up Vercel Blob Storage:**
   - In Vercel Dashboard → Storage → Create Database → Blob
   - `BLOB_READ_WRITE_TOKEN` is automatically set

6. **Deploy:**
   - Vercel will auto-deploy on push to main branch
   - Or click "Deploy" in dashboard

7. **Run Database Migrations:**
   ```bash
   # Using Vercel CLI
   vercel env pull .env.local
   npx prisma migrate deploy
   ```

8. **Create First Admin Account:**
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

9. **Configure Stripe Webhooks:**
   - Go to Stripe Dashboard → Webhooks
   - Add endpoint: `https://your-app.vercel.app/api/webhooks/stripe`
   - Select events: `customer.subscription.*`, `invoice.*`, `payment_intent.*`
   - Copy webhook signing secret to `STRIPE_WEBHOOK_SECRET`

10. **Configure Custom Domains (Optional):**
    - In Vercel Dashboard → Settings → Domains
    - Add your domain (e.g., `app.madrasah.io`)
    - Update `NEXTAUTH_URL` and `APP_BASE_URL` environment variables
    - Redeploy

### Post-Deployment

- [ ] Verify all environment variables are set
- [ ] Test login functionality
- [ ] Test payment flow
- [ ] Verify Stripe webhooks are receiving events
- [ ] Set up error tracking (Sentry)
- [ ] Set up uptime monitoring
- [ ] Review and customize Terms of Service and Privacy Policy pages

## Demo Accounts

After seeding, you can use these demo accounts:

- **Owner**: owner@demo.com (password: demo123)
- **Admin**: admin@demo.com (password: demo123)  
- **Staff**: staff@demo.com (password: demo123)
- **Parent**: parent@demo.com (password: demo123)

## Environment Variables

### Required
```env
# Core
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key
APP_BASE_URL=http://localhost:3000

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/madrasah_os?sslmode=require"

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PRICE_ID=price_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx (automatically set when you create Blob Storage in Vercel)

# Resend
RESEND_API_KEY=re_...
RESEND_FROM=Madrasah OS <noreply@madrasah.io>

# WhatsApp/Meta
META_APP_ID=your-app-id
META_APP_SECRET=your-app-secret
META_GRAPH_VERSION=v18.0
META_GRAPH_BASE=https://graph.facebook.com
WHATSAPP_EMBEDDED_REDIRECT_URL=http://localhost:3000/integrations/whatsapp/callback
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

### Optional (for development)
```env
WHATSAPP_DEV_ACCESS_TOKEN=your-dev-token
WHATSAPP_DEV_PHONE_NUMBER_ID=your-dev-phone-id
WHATSAPP_DEV_WABA_ID=your-dev-waba-id
```

## Documentation

### Quick Start
- **[Quick Start Deployment](docs/QUICK_START_DEPLOYMENT.md)** - Get deployed in ~60 minutes

### Core Documentation
- **[API Documentation](docs/API_DOCUMENTATION.md)** - Complete API reference with request/response examples
- **[Environment Variables](docs/ENVIRONMENT_VARIABLES.md)** - Complete reference for all environment variables
- **[Helper Scripts](docs/HELPER_SCRIPTS.md)** - Reference for all utility scripts

### Operations
- **[Runbook](docs/RUNBOOK.md)** - Common issues and troubleshooting guide
- **[Backup Strategy](docs/BACKUP_STRATEGY.md)** - Database backup and disaster recovery procedures
- **[Monitoring Setup](docs/MONITORING_SETUP.md)** - Guide for setting up error tracking and monitoring
- **[Domain Setup](docs/DOMAIN_SETUP.md)** - Guide for configuring custom domains and SSL

### Testing & Quality
- **[Testing Guide](docs/TESTING_GUIDE.md)** - Testing strategies and procedures
- **[Load Testing](docs/LOAD_TESTING.md)** - Load testing strategies and tools

### Deployment
- **[Deployment Guide](DEPLOYMENT.md)** - Production deployment instructions
- **[Pre-Launch Checklist](PRE_LAUNCH_CHECKLIST.md)** - Complete checklist before going live

## API Endpoints

See [API Documentation](docs/API_DOCUMENTATION.md) for complete API reference.

### Quick Reference
- `POST /api/attendance/bulk` - Bulk update attendance
- `POST /api/invoices/generate-monthly` - Generate monthly invoices
- `POST /api/payments/stripe/pay-now` - Process card payment
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `POST /api/cron/nightly-usage` - Report usage to Stripe (run nightly)

## Development

### Database Commands
```bash
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:seed      # Seed database with demo data
npm run db:studio    # Open Prisma Studio
```

### Testing
```bash
npm run test         # Run Playwright tests
npm run test:ui      # Run tests with UI
npm run test:clickall # Smoke test all pages
```

### Building
```bash
npm run build        # Build for production
npm run start        # Start production server
```

### Environment Validation
```bash
npm run validate-env      # Validate all environment variables before deployment
npm run test-db           # Test database connection and schema
npm run test-stripe       # Test Stripe configuration
npm run test-resend       # Test Resend email configuration
npm run verify-deployment # Verify deployment after going live
npm run load-test         # Load test API endpoints
npm run migrate:prod      # Safely run migrations on production
```

See [Helper Scripts](docs/HELPER_SCRIPTS.md) for all available utility scripts.

## Architecture

### Multi-tenancy
- All business data is scoped by `orgId`
- Users can belong to multiple organisations
- Role-based access control (RBAC)

### Portal Routing
- Host-based routing in production
- Query parameter override for development
- Middleware handles authentication and routing

### Payment Processing
- **Platform Billing**: Metered Stripe subscriptions per organisation
- **Parent Payments**: Stripe Elements for card payments
- **Off-session**: Automatic payments for enabled accounts

### File Storage
- Vercel Blob Storage for file storage (invoices, reports, etc.)
- Signed URLs for secure file access
- Organized by buckets (invoices, receipts, reports, imports)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For support, please contact the development team or create an issue in the repository.