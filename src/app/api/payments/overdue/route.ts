export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    // In demo mode, return mock overdue data
    if (process.env.NODE_ENV === 'development') {
      // Check if payment was recently processed (simulate payment success)
      const lastPaymentTime = request.headers.get('x-last-payment-time')
      const now = Date.now()
      
      // If payment was processed within the last 30 seconds, show no overdue
      if (lastPaymentTime && (now - parseInt(lastPaymentTime)) < 30000) {
        return NextResponse.json({
          hasOverdue: false,
          overdueAmount: 0,
          overdueCount: 0
        })
      }
      
      return NextResponse.json({
        hasOverdue: true,
        overdueAmount: 75,
        overdueCount: 1
      })
    }

    // Get overdue invoices for the parent
    const overdueInvoices = await prisma.invoice.findMany({
      where: {
        orgId: org.id,
        parentUserId: session.user.id,
        status: 'OVERDUE',
        dueDate: {
          lt: new Date()
        }
      }
    })

    const overdueAmount = overdueInvoices.reduce((sum, invoice) => sum + invoice.amount, 0)

    return NextResponse.json({
      hasOverdue: overdueInvoices.length > 0,
      overdueAmount,
      overdueCount: overdueInvoices.length
    })
  } catch (error: any) {
    logger.error('Error checking overdue payments', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Internal server error',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
