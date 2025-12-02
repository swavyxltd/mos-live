export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { calculatePaymentStatus } from '@/lib/payment-status'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

/**
 * POST /api/payments/update-statuses
 * Updates payment record statuses based on due dates
 * Can be called periodically or on-demand
 */
async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    // Get org feeDueDay setting
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { feeDueDay: true }
    })
    const orgFeeDueDay = (org as any)?.feeDueDay || 1

    // Get all unpaid payment records for this org
    const unpaidRecords = await prisma.monthlyPaymentRecord.findMany({
      where: {
        orgId,
        status: {
          in: ['PENDING', 'LATE', 'OVERDUE']
        }
      },
      include: {
        Class: {
          select: {
            id: true
          }
        }
      }
    })

    let updatedCount = 0

    // Update each record's status based on due date
    for (const record of unpaidRecords) {
      const newStatus = calculatePaymentStatus(
        record.status,
        record.month,
        orgFeeDueDay,
        record.paidAt
      )

      // Only update if status changed
      if (newStatus !== record.status) {
        await prisma.monthlyPaymentRecord.update({
          where: { id: record.id },
          data: { status: newStatus }
        })
        updatedCount++
      }
    }

    return NextResponse.json({
      success: true,
      updated: updatedCount,
      total: unpaidRecords.length
    })
  } catch (error: any) {
    logger.error('Error updating payment statuses', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update payment statuses',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

