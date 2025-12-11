import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins (owners)
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const checks: Record<string, any> = {}
    const overallStatus: string[] = []

    // 1. Database Connection (Neon/PostgreSQL)
    try {
      const dbStart = Date.now()
      await prisma.$queryRaw`SELECT 1`
      const dbResponseTime = Date.now() - dbStart
      
      // Try to get database name/connection info
      let dbInfo = 'PostgreSQL'
      try {
        const dbNameResult = await prisma.$queryRaw<Array<{ current_database: string }>>`
          SELECT current_database()
        `
        if (dbNameResult && dbNameResult[0]) {
          dbInfo = `PostgreSQL (${dbNameResult[0].current_database})`
        }
      } catch (e) {
        // Ignore if query fails
      }

      checks.database = {
        status: 'connected',
        provider: dbInfo,
        responseTime: `${dbResponseTime}ms`,
        connectionString: process.env.DATABASE_URL ? '✓ Configured' : '✗ Missing',
        details: dbResponseTime < 100 ? 'Excellent' : dbResponseTime < 500 ? 'Good' : 'Slow'
      }
      overallStatus.push('database')
    } catch (error: any) {
      checks.database = {
        status: 'disconnected',
        error: error?.message || 'Connection failed',
        connectionString: process.env.DATABASE_URL ? '✗ Invalid' : '✗ Missing'
      }
    }

    // 2. Stripe Connection
    try {
      if (!process.env.STRIPE_SECRET_KEY) {
        checks.stripe = {
          status: 'not_configured',
          error: 'STRIPE_SECRET_KEY environment variable not set',
          apiKey: '✗ Missing',
          webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '✓ Set' : '✗ Missing',
          priceId: process.env.STRIPE_PRICE_ID ? '✓ Set' : '✗ Missing'
        }
      } else {
        const stripeStart = Date.now()
        
        // Test Stripe API connection
        try {
          // Try to retrieve account info (lightweight call)
          if (!stripe) {
            throw new Error('Stripe not initialized')
          }
          await stripe.customers.list({ limit: 1 })
          const stripeResponseTime = Date.now() - stripeStart

          // Check if price ID is configured
          let priceInfo = 'Not configured'
          if (process.env.STRIPE_PRICE_ID) {
            try {
              const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID)
              priceInfo = `£${(price.unit_amount || 0) / 100} per ${price.recurring?.interval || 'month'}`
            } catch (e: any) {
              priceInfo = `✗ Invalid (${e?.message || 'Not found'})`
            }
          }

          checks.stripe = {
            status: 'connected',
            provider: 'Stripe',
            responseTime: `${stripeResponseTime}ms`,
            apiKey: process.env.STRIPE_SECRET_KEY.startsWith('sk_live_') ? '✓ Live' : '✓ Test',
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '✓ Configured' : '✗ Missing',
            priceId: process.env.STRIPE_PRICE_ID || '✗ Missing',
            priceInfo: priceInfo,
            webhookUrl: 'https://app.madrasah.io/api/webhooks/stripe'
          }
          overallStatus.push('stripe')
        } catch (error: any) {
          checks.stripe = {
            status: 'connection_failed',
            error: error?.message || 'Failed to connect to Stripe API',
            apiKey: process.env.STRIPE_SECRET_KEY ? '✗ Invalid' : '✗ Missing',
            webhookSecret: process.env.STRIPE_WEBHOOK_SECRET ? '✓ Set' : '✗ Missing',
            priceId: process.env.STRIPE_PRICE_ID ? '✓ Set' : '✗ Missing'
          }
        }
      }
    } catch (error: any) {
      checks.stripe = {
        status: 'error',
        error: error?.message || 'Unknown error'
      }
    }

    // 3. Email Service (Resend)
    try {
      if (!process.env.RESEND_API_KEY) {
        checks.email = {
          status: 'not_configured',
          error: 'RESEND_API_KEY environment variable not set',
          apiKey: '✗ Missing'
        }
      } else {
        const resendStart = Date.now()
        try {
          // Test Resend API connection
          const resendResponse = await fetch('https://api.resend.com/domains', {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            },
            signal: AbortSignal.timeout(5000)
          })
          const resendResponseTime = Date.now() - resendStart

          if (resendResponse.ok) {
            checks.email = {
              status: 'connected',
              provider: 'Resend',
              responseTime: `${resendResponseTime}ms`,
              apiKey: '✓ Configured',
              fromAddress: process.env.EMAIL_FROM_ADDRESS || 'Not set'
            }
            overallStatus.push('email')
          } else {
            checks.email = {
              status: 'authentication_failed',
              error: `API returned status ${resendResponse.status}`,
              apiKey: '✗ Invalid'
            }
          }
        } catch (error: any) {
          checks.email = {
            status: 'connection_failed',
            error: error?.message || 'Failed to connect to Resend API',
            apiKey: process.env.RESEND_API_KEY ? '✗ Invalid' : '✗ Missing'
          }
        }
      }
    } catch (error: any) {
      checks.email = {
        status: 'error',
        error: error?.message || 'Unknown error'
      }
    }

    // 4. Webhook Endpoint Status
    try {
      // Check if webhook endpoint is accessible
      const webhookUrl = 'https://app.madrasah.io/api/webhooks/stripe'
      const webhookStart = Date.now()
      const webhookResponse = await fetch(webhookUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })
      const webhookResponseTime = Date.now() - webhookStart

      if (webhookResponse.ok) {
        const webhookData = await webhookResponse.json()
        checks.webhook = {
          status: 'accessible',
          url: webhookUrl,
          responseTime: `${webhookResponseTime}ms`,
          method: webhookData.method || 'POST',
          events: webhookData.events || []
        }
        overallStatus.push('webhook')
      } else {
        checks.webhook = {
          status: 'error',
          url: webhookUrl,
          error: `HTTP ${webhookResponse.status}`,
          responseTime: `${webhookResponseTime}ms`
        }
      }
    } catch (error: any) {
      checks.webhook = {
        status: 'unreachable',
        url: 'https://app.madrasah.io/api/webhooks/stripe',
        error: error?.message || 'Failed to reach webhook endpoint'
      }
    }

    // 5. Environment Variables Check
    const requiredEnvVars = [
      { key: 'DATABASE_URL', name: 'Database URL' },
      { key: 'STRIPE_SECRET_KEY', name: 'Stripe Secret Key' },
      { key: 'STRIPE_WEBHOOK_SECRET', name: 'Stripe Webhook Secret' },
      { key: 'STRIPE_PRICE_ID', name: 'Stripe Price ID' },
      { key: 'RESEND_API_KEY', name: 'Resend API Key' },
      { key: 'NEXTAUTH_SECRET', name: 'NextAuth Secret' },
      { key: 'NEXTAUTH_URL', name: 'NextAuth URL' }
    ]

    const envVars: Record<string, any> = {}
    let allEnvVarsSet = true

    for (const envVar of requiredEnvVars) {
      const isSet = !!process.env[envVar.key]
      envVars[envVar.key] = {
        name: envVar.name,
        status: isSet ? 'set' : 'missing',
        value: isSet ? '✓ Configured' : '✗ Missing'
      }
      if (!isSet) {
        allEnvVarsSet = false
      }
    }

    checks.environment = {
      status: allEnvVarsSet ? 'complete' : 'incomplete',
      variables: envVars,
      missing: requiredEnvVars.filter(v => !process.env[v.key]).map(v => v.name)
    }

    // Overall status
    const allConnected = 
      checks.database?.status === 'connected' &&
      checks.stripe?.status === 'connected' &&
      checks.email?.status === 'connected' &&
      checks.webhook?.status === 'accessible'

    return NextResponse.json({
      overall: {
        status: allConnected ? 'all_connected' : 'some_issues',
        connected: overallStatus.length,
        total: 4,
        timestamp: new Date().toISOString()
      },
      checks
    })
  } catch (error: any) {
    logger.error('Error checking service status', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to check service status',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

