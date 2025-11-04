export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { sendParentOnboardingEmail } from '@/lib/mail'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const body = await request.json()
    const { firstName, lastName, parentEmail, classId, startMonth, status = 'ACTIVE' } = body

    // Validate required fields
    if (!firstName || !lastName || !parentEmail || !classId || !startMonth) {
      return NextResponse.json(
        { error: 'Missing required fields: firstName, lastName, parentEmail, classId, startMonth' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(parentEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Validate start month format (YYYY-MM)
    const monthRegex = /^\d{4}-\d{2}$/
    if (!monthRegex.test(startMonth)) {
      return NextResponse.json(
        { error: 'Invalid start month format. Use YYYY-MM (e.g., 2024-01)' },
        { status: 400 }
      )
    }

    // Get class and verify it belongs to org
    const classRecord = await prisma.class.findFirst({
      where: { id: classId, orgId, isArchived: false }
    })

    if (!classRecord) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      )
    }

    if (!classRecord.monthlyFeeP) {
      return NextResponse.json(
        { error: 'Class must have a monthly fee set' },
        { status: 400 }
      )
    }

    // Get org for email
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { name: true }
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Use transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create student
      const student = await tx.student.create({
        data: {
          orgId,
          firstName,
          lastName,
          isArchived: status === 'ARCHIVED'
        }
      })

      // Enroll student in class
      await tx.studentClass.create({
        data: {
          orgId,
          studentId: student.id,
          classId
        }
      })

      // Create parent invitation
      const token = crypto.randomBytes(32).toString('hex')
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 7) // 7 days expiry

      const invitation = await tx.parentInvitation.create({
        data: {
          orgId,
          studentId: student.id,
          parentEmail: parentEmail.toLowerCase(),
          token,
          expiresAt
        }
      })

      // Create payment record for start month
      await tx.monthlyPaymentRecord.create({
        data: {
          orgId,
          studentId: student.id,
          classId,
          month: startMonth,
          amountP: classRecord.monthlyFeeP,
          status: 'PENDING'
        }
      })

      return { student, invitation, token }
    })

    // Send onboarding email
    const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
    const setupUrl = `${baseUrl.replace(/\/$/, '')}/auth/parent-setup?token=${result.token}`

    try {
      await sendParentOnboardingEmail({
        to: parentEmail,
        orgName: org.name,
        studentName: `${firstName} ${lastName}`,
        setupUrl
      })
    } catch (emailError) {
      console.error('Failed to send parent onboarding email:', emailError)
      // Don't fail the request if email fails, but log it
    }

    return NextResponse.json({
      success: true,
      student: {
        id: result.student.id,
        firstName: result.student.firstName,
        lastName: result.student.lastName
      },
      invitationSent: true
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error creating student with invite:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to create student and send invitation' },
      { status: 500 }
    )
  }
}

