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

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // Verify user is a PARENT
    const { getUserRoleInOrg } = await import('@/lib/org')
    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    
    if (userRole !== 'PARENT') {
      return NextResponse.json({ error: 'Unauthorized - Parent access required' }, { status: 403 })
    }

    // Get all students for this parent
    const students = await prisma.student.findMany({
      where: {
        orgId: org.id,
        primaryParentId: session.user.id,
        isArchived: false
      },
      select: { id: true }
    })

    const studentIds = students.map(s => s.id)

    if (studentIds.length === 0) {
      return NextResponse.json({ payments: [] })
    }

    // Get last 3 payment records across all students
    const payments = await prisma.monthlyPaymentRecord.findMany({
      where: {
        orgId: org.id,
        studentId: { in: studentIds }
      },
      include: {
        Student: {
          select: {
            id: true,
            firstName: true,
            lastName: true
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
      },
      take: 3
    })

    return NextResponse.json({
      payments: payments.map(p => ({
        id: p.id,
        studentName: `${p.Student.firstName} ${p.Student.lastName}`,
        className: p.Class.name,
        amount: p.amountP,
        month: p.month,
        status: p.status,
        method: p.method,
        paidAt: p.paidAt,
        createdAt: p.createdAt
      }))
    })
  } catch (error: any) {
    logger.error('Error fetching payment history', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to fetch payment history',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

