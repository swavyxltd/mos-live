import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { outcome, callDateTime, notes, followUpDate } = body

    if (!outcome) {
      return NextResponse.json(
        { error: 'Call outcome is required' },
        { status: 400 }
      )
    }

    const validOutcomes = [
      'No answer',
      'Busy / Couldn\'t talk',
      'Spoke – interested',
      'Spoke – not interested',
      'Asked to call back later',
      'Wrong number',
    ]

    if (!validOutcomes.includes(outcome)) {
      return NextResponse.json(
        { error: 'Invalid call outcome' },
        { status: 400 }
      )
    }

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    const now = new Date()
    const callDate = callDateTime ? new Date(callDateTime) : now

    // Create activity with outcome
    const activity = await prisma.leadActivity.create({
      data: {
        leadId: params.id,
        type: 'CALL',
        description: notes || `Call attempt: ${outcome}`,
        outcome,
        createdAt: callDate,
        createdByUserId: session.user.id,
      },
    })

    // Update lead based on outcome
    const updateData: any = {
      lastContactAt: callDate,
    }

    // Handle different outcomes
    if (outcome === 'Asked to call back later') {
      // Use provided follow-up date or default to 7 days
      const followUp = followUpDate ? new Date(followUpDate) : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      updateData.nextContactAt = followUp
    } else if (outcome === 'Spoke – interested') {
      updateData.status = lead.status === 'NEW' ? 'CONTACTED' : lead.status
      // Set next contact to 3 days if not already set
      if (!lead.nextContactAt) {
        updateData.nextContactAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
      }
    } else if (outcome === 'Spoke – not interested') {
      updateData.status = 'COLD'
      updateData.nextContactAt = null
    } else if (outcome === 'Wrong number') {
      updateData.nextContactAt = null
    } else if (outcome === 'No answer' || outcome === 'Busy / Couldn\'t talk') {
      // Only set nextContactAt if it's null
      if (!lead.nextContactAt) {
        updateData.nextContactAt = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000)
      }
    }

    // Update lead
    await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ 
      activity,
      lead: {
        ...lead,
        ...updateData,
      }
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error logging call:', error)
    return NextResponse.json(
      { error: 'Failed to log call' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

