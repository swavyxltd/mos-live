import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { generateUniqueClaimCode, generateClaimCodeExpiration } from '@/lib/claim-codes'

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const body = await request.json()
    const { studentId } = body

    if (!studentId) {
      return NextResponse.json(
        { error: 'Student ID is required' },
        { status: 400 }
      )
    }

    // Verify student belongs to org
    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        orgId
      }
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Student not found' },
        { status: 404 }
      )
    }

    // Check if student is already claimed
    if (student.claimStatus === 'CLAIMED') {
      return NextResponse.json(
        { error: 'Cannot regenerate claim code for an already claimed student. Please contact support if needed.' },
        { status: 400 }
      )
    }

    // Generate new claim code
    const newClaimCode = await generateUniqueClaimCode(prisma)
    const newExpiration = generateClaimCodeExpiration(90)

    // Update student
    const updated = await prisma.student.update({
      where: { id: studentId },
      data: {
        claimCode: newClaimCode,
        claimCodeExpiresAt: newExpiration,
        claimStatus: 'NOT_CLAIMED', // Reset status if it was pending
        claimedByParentId: null
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        claimCode: true,
        claimCodeExpiresAt: true
      }
    })

    return NextResponse.json({
      success: true,
      student: updated
    })
  } catch (error: any) {
    logger.error('Error regenerating claim code', error)
    return NextResponse.json(
      { error: 'Failed to regenerate claim code' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

