export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { checkPaymentMethod } from '@/lib/payment-check'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    // Check payment method
    const hasPaymentMethod = await checkPaymentMethod()
    if (!hasPaymentMethod) {
      return NextResponse.json(
        { error: 'Payment method required. Please set up a payment method to create classes.' },
        { status: 402 }
      )
    }

    const body = await request.json()
    const { name, description, schedule, teacherId, monthlyFeeP, feeDueDay } = body

    if (!name || !schedule) {
      return NextResponse.json(
        { error: 'Name and schedule are required' },
        { status: 400 }
      )
    }

    if (monthlyFeeP === undefined || monthlyFeeP < 0) {
      return NextResponse.json(
        { error: 'Monthly fee must be provided and non-negative' },
        { status: 400 }
      )
    }

    if (feeDueDay !== undefined && (feeDueDay < 1 || feeDueDay > 31)) {
      return NextResponse.json(
        { error: 'Fee due day must be between 1 and 31' },
        { status: 400 }
      )
    }

    const classRecord = await prisma.class.create({
      data: {
        orgId,
        name,
        description: description || null,
        schedule,
        teacherId: teacherId || null,
        monthlyFeeP: Math.round(monthlyFeeP * 100), // Convert to pence
        feeDueDay: feeDueDay || null
      },
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(classRecord, { status: 201 })
  } catch (error: any) {
    logger.error('Create class error', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create class' },
      { status: 500 }
    )
  }
}

async function handleGET(request: NextRequest) {
  const session = await requireRole(['ADMIN', 'OWNER'])(request)
  if (session instanceof NextResponse) {
    return session
  }
  
  const orgId = await requireOrg(request)
  if (orgId instanceof NextResponse) {
    return orgId
  }
  
  const classes = await prisma.class.findMany({
    where: { orgId, isArchived: false },
    select: {
      id: true,
      name: true,
      description: true,
      schedule: true,
      teacherId: true,
      monthlyFeeP: true,
      User: {
        select: {
          id: true,
          name: true,
          email: true
        }
      }
    },
    orderBy: { name: 'asc' }
  })
  
  return NextResponse.json(classes)
}

export const GET = withRateLimit(handleGET)
