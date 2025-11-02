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
- **Settings**: Organization configuration

### Parent Portal (parent.madrasah.io)
- **Dashboard**: Overview of children's progress
- **Invoices**: View and pay invoices online
- **Calendar**: View class schedules and events
- **Support**: Create support tickets

### Owner Portal (SuperAdmin)
- **Overview**: Platform metrics and revenue
- **Organizations**: Manage all organizations
- **Dunning**: Handle billing failures
- **Support**: Global support management

## Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: NextAuth.js (Google OAuth + Credentials)
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

# OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret

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

## API Endpoints

### Core APIs
- `POST /api/attendance/bulk` - Bulk update attendance
- `POST /api/invoices/generate-monthly` - Generate monthly invoices
- `POST /api/invoices/[id]/record-cash` - Record cash payment
- `POST /api/messages/send` - Send announcements
- `GET /api/files/signed-url` - Get signed file URLs
- `GET /api/calendar/ics` - Export calendar as ICS

### Payment APIs
- `POST /api/payments/stripe/pay-now` - Process card payment
- `POST /api/payments/stripe/setup-intent` - Save payment method
- `POST /api/payments/stripe/autopay-toggle` - Toggle autopay

### Webhooks
- `POST /api/webhooks/stripe` - Stripe webhook handler
- `GET/POST /api/webhooks/whatsapp` - WhatsApp webhook handler

### Integration APIs
- `GET/POST /api/integrations/whatsapp/*` - WhatsApp integration

## Cron Endpoints

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

## Architecture

### Multi-tenancy
- All business data is scoped by `orgId`
- Users can belong to multiple organizations
- Role-based access control (RBAC)

### Portal Routing
- Host-based routing in production
- Query parameter override for development
- Middleware handles authentication and routing

### Payment Processing
- **Platform Billing**: Metered Stripe subscriptions per organization
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