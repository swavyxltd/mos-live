import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/api-middleware'
import { randomUUID } from 'crypto'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const excludeStatus = searchParams.get('excludeStatus')
    const assignedTo = searchParams.get('assignedTo')
    const city = searchParams.get('city')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'createdAt_desc'

    const where: any = {}

    if (status) {
      const statuses = status.split(',')
      where.status = { in: statuses }
    } else if (excludeStatus) {
      // Only apply excludeStatus if status is not explicitly set
      const excludedStatuses = excludeStatus.split(',')
      where.status = { notIn: excludedStatuses }
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
      select: {
        id: true,
        orgName: true,
        city: true,
        country: true,
        estimatedStudents: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        status: true,
        lastContactAt: true,
        nextContactAt: true,
        User: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        Org: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            LeadActivity: true,
          },
        },
      },
      orderBy,
    })

    // Map User to AssignedTo and Org to ConvertedOrg for frontend compatibility
    const mappedLeads = leads.map(lead => ({
      ...lead,
      AssignedTo: lead.User,
      ConvertedOrg: lead.Org,
      _count: {
        Activities: lead._count.LeadActivity,
      },
    }))

    return NextResponse.json({ leads: mappedLeads })
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
        id: randomUUID(),
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
        assignedToUserId: assignedToUserId || null,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        orgName: true,
        city: true,
        country: true,
        estimatedStudents: true,
        contactName: true,
        contactEmail: true,
        contactPhone: true,
        status: true,
        source: true,
        lastContactAt: true,
        nextContactAt: true,
        notes: true,
        assignedToUserId: true,
        convertedOrgId: true,
        createdAt: true,
        updatedAt: true,
        emailOutreachCompleted: true,
        lastEmailSentAt: true,
        lastEmailStage: true,
        User: {
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
          id: randomUUID(),
          leadId: lead.id,
          type: 'NOTE',
          description: `Lead created: ${notes}`,
          createdByUserId: session.user.id,
        },
      })
    }

    // Map User to AssignedTo for frontend compatibility
    const mappedLead = {
      ...lead,
      AssignedTo: lead.User,
    }

    return NextResponse.json({ lead: mappedLead }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating lead:', error)
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      meta: error.meta,
      stack: error.stack,
    })
    
    // Return more specific error messages
    let errorMessage = 'Failed to create lead'
    let statusCode = 500
    
    if (error.code === 'P2002') {
      // Unique constraint violation
      errorMessage = 'A lead with this information already exists'
      statusCode = 409
    } else if (error.code === 'P2003') {
      // Foreign key constraint violation
      errorMessage = 'Invalid reference data provided'
      statusCode = 400
    } else if (error.message) {
      errorMessage = error.message
    }
    
    return NextResponse.json(
      { 
        error: errorMessage,
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          code: error.code,
          meta: error.meta,
        } : undefined
      },
      { status: statusCode }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const POST = withRateLimit(handlePOST)

