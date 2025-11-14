export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'

// GET /api/events - Get all events for the current org
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
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    let whereClause: any = { orgId: org.id }

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    const events = await prisma.event.findMany({
      where: whereClause,
      include: {
        Class: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: { date: 'asc' }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error('Error fetching events:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

