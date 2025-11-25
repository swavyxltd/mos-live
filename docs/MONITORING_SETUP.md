# Monitoring Setup Guide

This guide helps you set up comprehensive monitoring for Madrasah OS in production.

## Overview

Monitoring is critical for:
- **Error Tracking**: Catch and fix bugs quickly
- **Performance**: Identify slow endpoints and optimize
- **Uptime**: Ensure service availability
- **User Experience**: Track key metrics

---

## 1. Error Tracking (Sentry)

### Why Sentry?
- Automatic error capture
- Stack traces with source maps
- User context and breadcrumbs
- Release tracking
- Performance monitoring

### Setup Steps

1. **Create Sentry Account**
   - Go to [sentry.io](https://sentry.io)
   - Sign up for free account
   - Create a new project (Next.js)

2. **Install Sentry SDK**
   ```bash
   npm install @sentry/nextjs
   ```

3. **Initialize Sentry**
   ```bash
   npx @sentry/wizard@latest -i nextjs
   ```
   This will:
   - Install dependencies
   - Create `sentry.client.config.ts`
   - Create `sentry.server.config.ts`
   - Create `sentry.edge.config.ts`
   - Update `next.config.ts`

4. **Configure Environment Variables**
   Add to Vercel Dashboard:
   ```
   SENTRY_DSN=your-sentry-dsn
   SENTRY_ORG=your-org
   SENTRY_PROJECT=your-project
   SENTRY_AUTH_TOKEN=your-auth-token
   ```

5. **Update Configuration**
   Edit `sentry.client.config.ts`:
   ```typescript
   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
     tracesSampleRate: 1.0, // Adjust based on traffic
     beforeSend(event, hint) {
       // Filter sensitive data
       if (event.request) {
         delete event.request.cookies
       }
       return event
     },
   })
   ```

6. **Test Error Tracking**
   Create a test endpoint:
   ```typescript
   // app/api/test-error/route.ts
   export async function GET() {
     throw new Error('Test error for Sentry')
   }
   ```

### Sentry Best Practices

- **Filter Sensitive Data**: Remove passwords, tokens, etc.
- **Set Sample Rate**: Adjust `tracesSampleRate` based on traffic
- **Release Tracking**: Tag releases with version numbers
- **Alert Rules**: Set up alerts for error spikes
- **Issue Assignment**: Assign issues to team members

---

## 2. Uptime Monitoring

### Option A: UptimeRobot (Free)

1. **Sign Up**
   - Go to [uptimerobot.com](https://uptimerobot.com)
   - Create free account (50 monitors)

2. **Create Monitor**
   - Monitor Type: HTTP(s)
   - URL: `https://your-app.vercel.app`
   - Monitoring Interval: 5 minutes
   - Alert Contacts: Add email/SMS

3. **Additional Monitors**
   - Staff Portal: `https://app.madrasah.io`
   - Parent Portal: `https://parent.madrasah.io`
   - API Health: `https://your-app.vercel.app/api/health`

### Option B: Pingdom

1. **Sign Up**
   - Go to [pingdom.com](https://pingdom.com)
   - Create account

2. **Create Check**
   - Check Type: HTTP
   - URL: Your production URL
   - Frequency: 1 minute
   - Alert Threshold: 2 consecutive failures

### Option C: Vercel Analytics (Built-in)

Vercel provides basic uptime monitoring:
- Go to Vercel Dashboard → Analytics
- View uptime metrics
- Set up alerts in project settings

---

## 3. Performance Monitoring

### Vercel Analytics (Already Configured)

Your app already has Vercel Analytics configured:
- Real User Monitoring (RUM)
- Web Vitals tracking
- Performance metrics

**Verify it's enabled:**
```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/next'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  )
}
```

### Custom Performance Tracking

Add custom metrics:
```typescript
// lib/analytics.ts
export function trackEvent(name: string, properties?: Record<string, any>) {
  if (typeof window !== 'undefined' && window.analytics) {
    window.analytics.track(name, properties)
  }
}

// Usage
trackEvent('payment_completed', {
  amount: 50,
  currency: 'GBP',
  method: 'card'
})
```

---

## 4. Database Monitoring

### Vercel Postgres Monitoring

If using Vercel Postgres:
- Go to Vercel Dashboard → Storage → Your Database
- View connection metrics
- Monitor query performance
- Set up alerts for connection issues

### Custom Database Monitoring

Add query logging:
```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' 
    ? ['error', 'warn'] 
    : ['query', 'error', 'warn'],
})

// Log slow queries
prisma.$use(async (params, next) => {
  const before = Date.now()
  const result = await next(params)
  const after = Date.now()
  
  if (after - before > 1000) {
    console.warn(`Slow query: ${params.model}.${params.action} took ${after - before}ms`)
  }
  
  return result
})
```

---

## 5. Payment Monitoring

### Stripe Dashboard

Monitor payment health:
- Go to Stripe Dashboard → Developers → Logs
- Set up webhook event monitoring
- Configure alerts for:
  - Failed payments
  - Webhook failures
  - API errors

### Custom Payment Alerts

Add payment failure tracking:
```typescript
// app/api/payments/stripe/pay-now/route.ts
try {
  // Payment processing
} catch (error) {
  // Log to Sentry
  Sentry.captureException(error, {
    tags: { type: 'payment_failure' },
    extra: { invoiceId, amount }
  })
  
  // Send alert (if critical)
  if (isCriticalError(error)) {
    await sendAlert('Payment processing failed', error)
  }
}
```

---

## 6. Email Monitoring

### Resend Dashboard

Monitor email delivery:
- Go to Resend Dashboard → Emails
- View delivery rates
- Check bounce rates
- Monitor spam complaints

### Set Up Alerts

Configure alerts for:
- High bounce rate (> 10%)
- Low delivery rate (< 90%)
- Spam complaints

---

## 7. Log Aggregation

### Vercel Logs

View logs in Vercel Dashboard:
- Go to Project → Logs
- Filter by function, status, etc.
- Export logs for analysis

### Structured Logging

Use structured logs:
```typescript
// lib/logger.ts
export function logError(error: Error, context?: Record<string, any>) {
  console.error(JSON.stringify({
    level: 'error',
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
    ...context
  }))
}
```

---

## 8. Alert Configuration

### Critical Alerts

Set up alerts for:
1. **Error Rate**: > 5% in 5 minutes
2. **Response Time**: p95 > 2 seconds
3. **Database**: Connection failures
4. **Payments**: Stripe API errors
5. **Uptime**: Service down

### Alert Channels

Configure multiple channels:
- Email (always)
- SMS (critical only)
- Slack/Discord (team notifications)
- PagerDuty (on-call rotation)

---

## 9. Dashboard Setup

### Create Monitoring Dashboard

Use tools like:
- **Grafana**: Custom dashboards
- **Datadog**: Full-stack monitoring
- **New Relic**: APM and monitoring

### Key Metrics to Track

1. **Application Metrics**
   - Request rate
   - Error rate
   - Response time (p50, p95, p99)
   - Active users

2. **Business Metrics**
   - New signups
   - Payment success rate
   - Student enrollment rate
   - Invoice generation

3. **Infrastructure Metrics**
   - Database connections
   - API rate limit usage
   - Storage usage
   - Function execution time

---

## 10. Testing Your Monitoring

### Test Checklist

- [ ] Trigger test error → Verify Sentry captures it
- [ ] Simulate downtime → Verify uptime monitor alerts
- [ ] Make slow query → Verify performance alert
- [ ] Fail payment → Verify Stripe alert
- [ ] Send test email → Verify delivery tracking

---

## Quick Start Checklist

1. [ ] Set up Sentry account and configure
2. [ ] Set up UptimeRobot monitors
3. [ ] Verify Vercel Analytics is enabled
4. [ ] Configure Stripe webhook monitoring
5. [ ] Set up Resend email monitoring
6. [ ] Configure alert channels
7. [ ] Create monitoring dashboard
8. [ ] Test all monitoring systems

---

## Cost Estimates

- **Sentry**: Free tier (5,000 events/month)
- **UptimeRobot**: Free (50 monitors)
- **Vercel Analytics**: Included with Vercel
- **Stripe Monitoring**: Included
- **Resend Monitoring**: Included

**Total**: $0/month for basic monitoring

---

## Support

- **Sentry Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **UptimeRobot Docs**: https://uptimerobot.com/api/
- **Vercel Analytics**: https://vercel.com/docs/analytics

---

**Last Updated**: 2025-11-25

