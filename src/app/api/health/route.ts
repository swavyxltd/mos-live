import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * Health Check Endpoint
 * Returns system health status for monitoring
 * 
 * GET /api/health
 */
export async function GET() {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: 'unknown',
      stripe: 'unknown',
      resend: 'unknown',
    },
    uptime: process.uptime(),
  }

  // Check database
  try {
    await prisma.$queryRaw`SELECT 1`
    health.checks.database = 'healthy'
  } catch (error) {
    health.checks.database = 'unhealthy'
    health.status = 'degraded'
  }

  // Check Stripe (if configured)
  if (process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = (await import('stripe')).default
      const stripeClient = new stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-12-18.acacia',
      })
      await stripeClient.accounts.retrieve()
      health.checks.stripe = 'healthy'
    } catch {
      health.checks.stripe = 'unhealthy'
      health.status = 'degraded'
    }
  } else {
    health.checks.stripe = 'not_configured'
  }

  // Check Resend (if configured)
  if (process.env.RESEND_API_KEY) {
    try {
      // Resend doesn't have a direct health check, so we just verify the client initializes
      await import('resend')
      health.checks.resend = 'healthy'
    } catch {
      health.checks.resend = 'unhealthy'
      health.status = 'degraded'
    }
  } else {
    health.checks.resend = 'not_configured'
  }

  const statusCode = health.status === 'healthy' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}

