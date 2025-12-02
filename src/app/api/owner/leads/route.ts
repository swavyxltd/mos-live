import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const assignedTo = searchParams.get('assignedTo')
    const city = searchParams.get('city')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt_desc'

    const where: any = {}

    if (status) {
      const statuses = status.split(',')
      where.status = { in: statuses }
    }

    if (assignedTo) {
      where.assignedToUserId = assignedTo
    }

    if (city) {
      where.city = { contains: city, mode: 'insensitive' }
    }

    if (search) {
      where.OR = [
        { orgName: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { contactEmail: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
      ]
    }

    // Parse sortBy parameter (format: "field_direction")
    const [sortField, sortDirection] = sortBy.split('_')
    const orderBy: any = {}
    
    // Handle different sort fields
    if (sortField === 'orgName' || sortField === 'status' || sortField === 'createdAt' || 
        sortField === 'nextContactAt' || sortField === 'lastContactAt') {
      orderBy[sortField] = sortDirection === 'asc' ? 'asc' : 'desc'
    } else {
      // Default to createdAt desc if invalid sort
      orderBy.createdAt = 'desc'
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        AssignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        ConvertedOrg: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            Activities: true,
          },
        },
      },
      orderBy,
    })

    return NextResponse.json({ leads })
  } catch (error: any) {
    console.error('Error fetching leads:', error)
    console.error('Error stack:', error.stack)
    console.error('Error name:', error.name)
    console.error('Error code:', error.code)
    console.error('Error meta:', error.meta)
    return NextResponse.json(
      { 
        error: 'Failed to fetch leads',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          name: error.name,
          code: error.code,
          meta: error.meta,
          stack: error.stack,
        } : undefined
      },
      { status: 500 }
    )
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      orgName,
      city,
      country = 'UK',
      estimatedStudents,
      contactName,
      contactEmail,
      contactPhone,
      source,
      status = 'NEW',
      nextContactAt,
      notes,
      assignedToUserId,
    } = body

    if (!orgName) {
      return NextResponse.json(
        { error: 'Madrasah name is required' },
        { status: 400 }
      )
    }

    if (!city || !city.trim()) {
      return NextResponse.json(
        { error: 'City is required' },
        { status: 400 }
      )
    }

    const lead = await prisma.lead.create({
      data: {
        orgName,
        city,
        country,
        estimatedStudents: estimatedStudents ? parseInt(estimatedStudents) : null,
        contactName,
        contactEmail,
        contactPhone,
        source,
        status,
        nextContactAt: nextContactAt ? new Date(nextContactAt) : null,
        notes,
        assignedToUserId,
      },
      include: {
        AssignedTo: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Create initial activity if notes provided
    if (notes) {
      await prisma.leadActivity.create({
        data: {
          leadId: lead.id,
          type: 'NOTE',
          description: `Lead created: ${notes}`,
          createdByUserId: session.user.id,
        },
      })
    }

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating lead:', error)
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const POST = withRateLimit(handlePOST)

