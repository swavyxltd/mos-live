import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { isValidEmail } from '@/lib/input-validation'

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')
    const email = searchParams.get('email')

    if (!token || !email) {
      return NextResponse.json(
        { error: 'Token and email are required' },
        { status: 400 }
      )
    }

    const sanitizedEmail = email.toLowerCase().trim()
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: {
        identifier_token: {
          identifier: sanitizedEmail,
          token: token
        }
      }
    })

    if (!verificationToken) {
      return NextResponse.json(
        { error: 'Invalid or expired verification link' },
        { status: 400 }
      )
    }

    // Check if token has expired
    if (new Date() > verificationToken.expires) {
      return NextResponse.json(
        { error: 'Verification link has expired. Please request a new one.' },
        { status: 400 }
      )
    }

    // Update user email verification status and complete claim process
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { email: sanitizedEmail },
        select: { id: true }
      })

      if (user) {
        // Update email verification
        await tx.user.update({
          where: { id: user.id },
          data: {
            emailVerified: new Date()
          }
        })

        // Find any pending claims for this parent and mark them as CLAIMED
        const pendingLinks = await tx.parentStudentLink.findMany({
          where: {
            parentId: user.id,
            claimedAt: null
          },
          include: {
            Student: {
              select: {
                id: true,
                claimStatus: true
              }
            }
          }
        })

        // Update claim status and set claimedAt
        for (const link of pendingLinks) {
          if (link.Student.claimStatus === 'PENDING_VERIFICATION') {
            await tx.student.update({
              where: { id: link.studentId },
              data: {
                claimStatus: 'CLAIMED'
              }
            })

            await tx.parentStudentLink.update({
              where: {
                parentId_studentId: {
                  parentId: link.parentId,
                  studentId: link.studentId
                }
              },
              data: {
                claimedAt: new Date()
              }
            })
          }
        }
      }

      // Delete verification token
      await tx.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: sanitizedEmail,
            token: token
          }
        }
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully'
    })
  } catch (error: any) {
    logger.error('Error verifying email', error)
    return NextResponse.json(
      { error: 'Failed to verify email' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET, { strict: true })

