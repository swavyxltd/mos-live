export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { checkPaymentMethod } from '@/lib/payment-check'

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
    const { name, description, schedule, teacherId, monthlyFeeP } = body

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

    const classRecord = await prisma.class.create({
      data: {
        orgId,
        name,
        description: description || null,
        schedule,
        teacherId: teacherId || null,
        monthlyFeeP: Math.round(monthlyFeeP * 100) // Convert to pence
      },
      include: {
        teacher: {
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
    console.error('Create class error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create class' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    console.log('[API] GET /api/classes - Starting request')
    
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) {
      console.log('[API] Session check failed:', session.status)
      return session
    }
    
    console.log('[API] Session validated, user:', session.user?.email)
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) {
      console.log('[API] Org check failed:', orgId.status)
      return orgId
    }
    
    console.log('[API] Org ID:', orgId)
    
    const classes = await prisma.class.findMany({
      where: { orgId, isArchived: false },
      select: {
        id: true,
        name: true,
        description: true,
        schedule: true,
        teacherId: true,
        monthlyFeeP: true,
        teacher: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { name: 'asc' }
    })
    
    console.log(`[API] Found ${classes.length} classes for org ${orgId}`)
    return NextResponse.json(classes)
  } catch (error: any) {
    console.error('[API] ❌ Error fetching classes:', error)
    console.error('[API] Error details:', {
      message: error?.message || 'Unknown error',
      stack: error?.stack || 'No stack trace',
      name: error?.name || 'Unknown',
      cause: error?.cause || 'No cause'
    })
    
    // Return a more detailed error response
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to fetch classes',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error?.stack,
          name: error?.name
        } : undefined
      },
      { status: 500 }
    )
  }
}
