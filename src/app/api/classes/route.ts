export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

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
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
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
    
    return NextResponse.json(classes)
  } catch (error) {
    console.error('Get classes error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch classes' },
      { status: 500 }
    )
  }
}
