export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { requireRole } from '@/lib/roles'

// GET /api/parents - Get all parents for the current org
export async function GET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const parents = await prisma.user.findMany({
      where: {
        UserOrgMembership: {
          some: {
            orgId: org.id,
            role: 'PARENT'
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(parents)
  } catch (error) {
    console.error('Error fetching parents:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

