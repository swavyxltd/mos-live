export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'

// GET /api/applications - Get all applications for the current org
export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const applications = await prisma.application.findMany({
      where: { orgId: org.id },
      include: {
        children: true,
        reviewedBy: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { submittedAt: 'desc' }
    })

    return NextResponse.json(applications)
  } catch (error) {
    console.error('Error fetching applications:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/applications - Create a new application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      orgId, 
      guardianName, 
      guardianPhone, 
      guardianEmail, 
      guardianAddress,
      children,
      preferredClass,
      preferredTerm,
      preferredStartDate,
      additionalNotes
    } = body

    // Validate required fields
    if (!orgId || !guardianName || !guardianPhone || !guardianEmail || !children || children.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate children have required fields
    const validChildren = children.filter((child: any) => child.firstName && child.lastName)
    if (validChildren.length === 0) {
      return NextResponse.json({ error: 'At least one child with first and last name is required' }, { status: 400 })
    }

    // Create the application
    const application = await prisma.application.create({
      data: {
        orgId,
        guardianName,
        guardianPhone,
        guardianEmail,
        guardianAddress,
        preferredClass,
        preferredTerm,
        preferredStartDate: preferredStartDate ? new Date(preferredStartDate) : undefined,
        additionalNotes,
        children: {
          create: validChildren.map((child: any) => ({
            firstName: child.firstName,
            lastName: child.lastName,
            dob: child.dob ? new Date(child.dob) : undefined,
            gender: child.gender
          }))
        }
      },
      include: {
        children: true
      }
    })

    // TODO: Send confirmation email if Resend is configured
    // This would be implemented here if email functionality is available

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    console.error('Error creating application:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
