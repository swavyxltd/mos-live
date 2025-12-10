export const runtime = 'nodejs'

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/api-middleware'
import { randomUUID } from 'crypto'

async function handleGET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - in Next.js 15+, params can be a Promise
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    
    console.log('[LEAD API] Fetching lead:', { 
      id, 
      paramsType: typeof params, 
      isPromise: params instanceof Promise,
      resolvedParams 
    })
    
    if (!id) {
      console.error('[LEAD API] No ID provided:', { params, resolvedParams })
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }
    
    const lead = await prisma.lead.findUnique({
      where: { id },
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
        Org: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        LeadActivity: {
          select: {
            id: true,
            type: true,
            description: true,
            outcome: true,
            createdAt: true,
            User: {
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

    if (!lead) {
      console.error('[LEAD API] Lead not found in database:', { id })
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    console.log('[LEAD API] Lead found:', { id, orgName: lead.orgName })

    // Map relations to expected frontend format
    const mappedLead = {
      ...lead,
      AssignedTo: lead.User,
      ConvertedOrg: lead.Org,
      Activities: lead.LeadActivity.map(activity => ({
        ...activity,
        CreatedBy: activity.User,
      })),
    }

    console.log('[LEAD API] Returning lead data')
    return NextResponse.json({ lead: mappedLead })
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
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - in Next.js 15+, params can be a Promise
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    
    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
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
      where: { id },
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

    const updateData: any = {
      updatedAt: new Date()
    }
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
            id: randomUUID(),
            leadId: id,
            type: 'STATUS_CHANGE',
            description: `Status changed from ${existingLead.status} to ${status}`,
            createdByUserId: session.user.id,
          },
        })
      }
    }

    // Always update updatedAt
    updateData.updatedAt = new Date()

    const lead = await prisma.lead.update({
      where: { id },
      data: updateData,
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
        Org: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    })

    // Map relations to expected frontend format
    const mappedLead = {
      ...lead,
      AssignedTo: lead.User,
      ConvertedOrg: lead.Org,
    }

    return NextResponse.json({ lead: mappedLead })
  } catch (error: any) {
    console.error('Error updating lead:', error)
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    )
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - in Next.js 15+, params can be a Promise
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    
    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
      select: {
        id: true,
        orgName: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Check if lead has been converted to an organisation
    const convertedLead = await prisma.lead.findUnique({
      where: { id },
      select: {
        convertedOrgId: true,
      },
    })

    if (convertedLead?.convertedOrgId) {
      return NextResponse.json(
        { error: 'Cannot delete a lead that has been converted to an organisation' },
        { status: 400 }
      )
    }

    // Delete the lead (LeadActivity will be cascade deleted)
    await prisma.lead.delete({
      where: { id },
    })

    return NextResponse.json({ 
      success: true,
      message: `Lead "${lead.orgName}" deleted successfully` 
    })
  } catch (error: any) {
    console.error('Error deleting lead:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete lead',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const PUT = withRateLimit(handlePUT)
export const DELETE = withRateLimit(handleDELETE)


