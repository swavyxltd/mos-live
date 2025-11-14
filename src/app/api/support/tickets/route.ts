export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'

// GET /api/support/tickets - Get all support tickets for the current org
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const role = searchParams.get('role')

    let whereClause: any = { orgId: org.id }

    // Filter by status if provided
    if (status) {
      whereClause.status = status
    }

    // Filter by role if provided
    if (role) {
      whereClause.role = role
    }

    const tickets = await prisma.supportTicket.findMany({
      where: whereClause,
      include: {
        User: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(tickets)
  } catch (error) {
    console.error('Error fetching support tickets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/support/tickets - Create a new support ticket
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const body = await request.json()
    const { subject, body: ticketBody, role } = body

    if (!subject || !ticketBody) {
      return NextResponse.json({ error: 'Subject and body are required' }, { status: 400 })
    }

    const ticket = await prisma.supportTicket.create({
      data: {
        orgId: org.id,
        createdById: session.user.id,
        role: role || 'USER',
        subject,
        body: ticketBody,
        status: 'OPEN'
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

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    console.error('Error creating support ticket:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
