import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/api-middleware'
import { randomUUID } from 'crypto'

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle Next.js 15+ async params
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams

    const body = await request.json()
    const { type, description, updateLastContactAt } = body

    if (!type || !description) {
      return NextResponse.json(
        { error: 'Type and description are required' },
        { status: 400 }
      )
    }

    const validTypes = ['CALL', 'WHATSAPP', 'EMAIL', 'MEETING', 'NOTE', 'STATUS_CHANGE']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid activity type' },
        { status: 400 }
      )
    }

    // Check if lead exists
    const lead = await prisma.lead.findUnique({
      where: { id },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    // Create activity
    const activity = await prisma.leadActivity.create({
      data: {
        id: randomUUID(),
        leadId: id,
        type,
        description,
        createdByUserId: session.user.id,
      },
      include: {
        CreatedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    // Update lastContactAt if this is a contact activity
    if (updateLastContactAt && ['CALL', 'WHATSAPP', 'EMAIL', 'MEETING'].includes(type)) {
      await prisma.lead.update({
        where: { id },
        data: {
          lastContactAt: new Date(),
        },
      })
    }

    return NextResponse.json({ activity }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating activity:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

