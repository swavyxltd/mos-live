export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month')

    const now = new Date()
    const currentMonth = month || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    // Count failed card payments for current month
    const failedCount = await prisma.monthlyPaymentRecord.count({
      where: {
        orgId,
        status: 'FAILED',
        method: 'CARD',
        month: currentMonth
      }
    })

    // Get failed payments with details
    const failedPayments = await prisma.monthlyPaymentRecord.findMany({
      where: {
        orgId,
        status: 'FAILED',
        method: 'CARD',
        month: currentMonth
      },
      include: {
        Student: {
          include: {
            User: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        Class: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    return NextResponse.json({
      count: failedCount,
      month: currentMonth,
      payments: failedPayments.map(p => ({
        id: p.id,
        studentName: `${p.Student.firstName} ${p.Student.lastName}`,
        parentName: p.Student.User?.name || 'Unknown',
        parentEmail: p.Student.User?.email || null,
        className: p.Class.name,
        amount: p.amountP,
        month: p.month,
        failureReason: p.notes,
        lastAttemptDate: p.updatedAt
      }))
    })
  } catch (error: any) {
    logger.error('Error fetching failed payments stats', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to fetch failed payments stats',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

