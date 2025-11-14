export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { calculatePaymentStatus } from '@/lib/payment-status'

/**
 * POST /api/payments/update-statuses
 * Updates payment record statuses based on due dates
 * Can be called periodically or on-demand
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

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
            id: true,
            feeDueDay: true
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
        record.Class.feeDueDay,
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
    console.error('Error updating payment statuses:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to update payment statuses' },
      { status: 500 }
    )
  }
}

