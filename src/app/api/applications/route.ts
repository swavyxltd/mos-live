export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { randomUUID } from 'crypto'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidEmail, isValidPhone, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'

// GET /api/applications - Get all applications for the current org
async function handleGET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // CRITICAL: Use authenticated user's orgId, never from query params
    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const applications = await prisma.application.findMany({
      where: { orgId: org.id },
      include: {
        ApplicationChild: true,
        User: {
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
    logger.error('Error fetching applications', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/applications - Create a new application
async function handlePOST(request: NextRequest) {
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
      preferredStartDate,
      additionalNotes
    } = body

    // Validate required fields
    if (!orgId || !guardianName || !guardianPhone || !guardianEmail || !children || children.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Sanitize and validate input
    const sanitizedGuardianName = sanitizeText(guardianName, MAX_STRING_LENGTHS.name)
    const sanitizedGuardianEmail = guardianEmail.toLowerCase().trim()
    const sanitizedGuardianPhone = sanitizeText(guardianPhone, MAX_STRING_LENGTHS.phone)
    
    if (!isValidEmail(sanitizedGuardianEmail)) {
      return NextResponse.json({ error: 'Invalid guardian email address' }, { status: 400 })
    }
    
    if (!isValidPhone(sanitizedGuardianPhone)) {
      return NextResponse.json({ error: 'Invalid guardian phone number' }, { status: 400 })
    }

    // Validate children have required fields and sanitize
    const validChildren = children
      .filter((child: any) => child.firstName && child.lastName)
      .map((child: any) => ({
        ...child,
        firstName: sanitizeText(child.firstName, MAX_STRING_LENGTHS.name),
        lastName: sanitizeText(child.lastName, MAX_STRING_LENGTHS.name)
      }))
    
    if (validChildren.length === 0) {
      return NextResponse.json({ error: 'At least one child with first and last name is required' }, { status: 400 })
    }
    
    // Verify org exists and is not deactivated or paused (public route, but we should validate orgId)
    const org = await prisma.org.findUnique({ 
      where: { id: orgId },
      select: { id: true, name: true, status: true }
    })
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }
    if (org.status === 'DEACTIVATED' || org.status === 'PAUSED') {
      return NextResponse.json({ error: 'Organization is not accepting applications' }, { status: 403 })
    }

    // Create the application
    const now = new Date()
    const application = await prisma.application.create({
      data: {
        id: randomUUID(),
        orgId,
        status: 'NEW', // Default status for new applications
        guardianName: sanitizedGuardianName,
        guardianPhone: sanitizedGuardianPhone,
        guardianEmail: sanitizedGuardianEmail,
        guardianAddress: guardianAddress ? sanitizeText(guardianAddress, MAX_STRING_LENGTHS.address) : null,
        preferredClass: preferredClass ? sanitizeText(preferredClass, MAX_STRING_LENGTHS.name) : null,
        preferredStartDate: preferredStartDate ? new Date(preferredStartDate) : undefined,
        additionalNotes: additionalNotes ? sanitizeText(additionalNotes, MAX_STRING_LENGTHS.notes) : null,
        submittedAt: now, // Set submittedAt to current time
        updatedAt: now,
        ApplicationChild: {
          create: validChildren.map((child: any) => ({
            id: randomUUID(),
            firstName: child.firstName,
            lastName: child.lastName,
            dob: child.dob ? new Date(child.dob) : undefined,
            gender: child.gender ? sanitizeText(child.gender, 50) : null,
            updatedAt: now
          }))
        }
      },
      include: {
        ApplicationChild: true
      }
    })

    // Send confirmation email to parent
    try {
      const { sendApplicationSubmissionConfirmation } = await import('@/lib/mail')
      await sendApplicationSubmissionConfirmation({
        to: sanitizedGuardianEmail,
        orgName: org.name,
        parentName: sanitizedGuardianName,
        applicationId: application.id
      })
      logger.info('Application submission confirmation email sent', {
        to: sanitizedGuardianEmail,
        applicationId: application.id
      })
    } catch (emailError: any) {
      logger.error('Failed to send application confirmation email', emailError, {
        to: sanitizedGuardianEmail,
        applicationId: application.id
      })
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json(application, { status: 201 })
  } catch (error) {
    logger.error('Error creating application', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withRateLimit(handleGET)
export const POST = withRateLimit(handlePOST, { strict: true })
