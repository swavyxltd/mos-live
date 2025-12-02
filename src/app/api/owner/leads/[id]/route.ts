import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
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
        Activities: {
          include: {
            CreatedBy: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    })

    // Ensure new fields are included in response
    if (lead) {
      lead.lastEmailSentAt = lead.lastEmailSentAt || null
      lead.lastEmailStage = lead.lastEmailStage || null
      lead.emailOutreachCompleted = lead.emailOutreachCompleted || false
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    return NextResponse.json({ lead })
  } catch (error: any) {
    console.error('Error fetching lead:', error)
    console.error('Error details:', {
      message: error.message,
      name: error.name,
      stack: error.stack,
    })
    return NextResponse.json(
      { 
        error: 'Failed to fetch lead',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

async function handlePUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      orgName,
      city,
      country,
      estimatedStudents,
      contactName,
      contactEmail,
      contactPhone,
      source,
      status,
      lastContactAt,
      nextContactAt,
      notes,
      assignedToUserId,
      createStatusChangeActivity,
    } = body

    const existingLead = await prisma.lead.findUnique({
      where: { id: params.id },
      select: { status: true },
    })

    if (!existingLead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Validate city if provided
    if (city !== undefined && (!city || !city.trim())) {
      return NextResponse.json(
        { error: 'City is required' },
        { status: 400 }
      )
    }

    const updateData: any = {}
    if (orgName !== undefined) updateData.orgName = orgName
    if (city !== undefined) updateData.city = city
    if (country !== undefined) updateData.country = country
    if (estimatedStudents !== undefined) {
      updateData.estimatedStudents = estimatedStudents ? parseInt(estimatedStudents) : null
    }
    if (contactName !== undefined) updateData.contactName = contactName
    if (contactEmail !== undefined) updateData.contactEmail = contactEmail
    if (contactPhone !== undefined) updateData.contactPhone = contactPhone
    if (source !== undefined) updateData.source = source
    if (lastContactAt !== undefined) {
      updateData.lastContactAt = lastContactAt ? new Date(lastContactAt) : null
    }
    if (nextContactAt !== undefined) {
      updateData.nextContactAt = nextContactAt ? new Date(nextContactAt) : null
    }
    if (notes !== undefined) updateData.notes = notes
    if (assignedToUserId !== undefined) updateData.assignedToUserId = assignedToUserId

    // Handle status change with activity
    if (status !== undefined && status !== existingLead.status) {
      updateData.status = status
      
      if (createStatusChangeActivity) {
        await prisma.leadActivity.create({
          data: {
            leadId: params.id,
            type: 'STATUS_CHANGE',
            description: `Status changed from ${existingLead.status} to ${status}`,
            createdByUserId: session.user.id,
          },
        })
      }
    }

    const lead = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
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
      },
    })

    return NextResponse.json({ lead })
  } catch (error: any) {
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const PUT = withRateLimit(handlePUT)

