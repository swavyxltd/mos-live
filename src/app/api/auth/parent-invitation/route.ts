export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = searchParams.get('token')

    if (!token) {
      return NextResponse.json(
        { error: 'Token is required' },
        { status: 400 }
      )
    }

    const invitation = await prisma.parentInvitation.findUnique({
      where: { token },
      include: {
        student: {
          include: {
            studentClasses: {
              include: {
                class: {
                  select: {
                    id: true,
                    name: true,
                    monthlyFeeP: true
                  }
                }
              }
            },
            primaryParent: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        org: {
          select: {
            id: true,
            name: true,
            cashPaymentEnabled: true,
            bankTransferEnabled: true,
            stripeEnabled: true,
            acceptsCard: true,
            acceptsCash: true,
            acceptsBankTransfer: true,
            stripeConnectAccountId: true,
            bankAccountName: true,
            bankSortCode: true,
            bankAccountNumber: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'This invitation has already been used' },
        { status: 400 }
      )
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      )
    }

    // Get the student's class
    const studentClass = invitation.student.studentClasses[0]
    if (!studentClass) {
      return NextResponse.json(
        { error: 'Student is not enrolled in any class' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        parentEmail: invitation.parentEmail,
        expiresAt: invitation.expiresAt
      },
      student: {
        id: invitation.student.id,
        firstName: invitation.student.firstName,
        lastName: invitation.student.lastName,
        dob: invitation.student.dob,
        allergies: invitation.student.allergies,
        medicalNotes: invitation.student.medicalNotes
      },
      parent: invitation.student.primaryParent ? {
        name: invitation.student.primaryParent.name || '',
        phone: invitation.student.primaryParent.phone || ''
      } : null,
      class: {
        id: studentClass.class.id,
        name: studentClass.class.name,
        monthlyFee: studentClass.class.monthlyFeeP ? studentClass.class.monthlyFeeP / 100 : 0
      },
      org: {
        id: invitation.org.id,
        name: invitation.org.name
      },
      paymentMethods: {
        cash: invitation.org.acceptsCash ?? invitation.org.cashPaymentEnabled ?? true,
        bankTransfer: invitation.org.acceptsBankTransfer ?? invitation.org.bankTransferEnabled ?? true,
        card: invitation.org.acceptsCard ?? false && !!invitation.org.stripeConnectAccountId,
        stripe: invitation.org.stripeEnabled
      },
      bankDetails: {
        accountName: invitation.org.bankAccountName,
        sortCode: invitation.org.bankSortCode,
        accountNumber: invitation.org.bankAccountNumber
      }
    })
  } catch (error: any) {
    logger.error('Error fetching parent invitation', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation details' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

