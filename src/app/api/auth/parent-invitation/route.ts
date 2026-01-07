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
        Student: {
          include: {
            StudentClass: {
              include: {
                Class: {
                  select: {
                    id: true,
                    name: true,
                    monthlyFeeP: true
                  }
                }
              }
            },
            User: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        },
        Org: {
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
            bankAccountNumber: true,
            billingDay: true,
            feeDueDay: true,
            paymentInstructions: true
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
    const studentClass = invitation.Student.StudentClass[0]
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
        id: invitation.Student.id,
        firstName: invitation.Student.firstName,
        lastName: invitation.Student.lastName,
        dob: invitation.Student.dob,
        allergies: invitation.Student.allergies,
        medicalNotes: invitation.Student.medicalNotes
      },
      parent: invitation.Student.User ? {
        name: invitation.Student.User.name || '',
        phone: invitation.Student.User.phone || ''
      } : null,
      class: {
        id: studentClass.Class.id,
        name: studentClass.Class.name,
        monthlyFee: studentClass.Class.monthlyFeeP ? studentClass.Class.monthlyFeeP / 100 : 0
      },
      org: {
        id: invitation.Org.id,
        name: invitation.Org.name
      },
      paymentMethods: {
        cash: invitation.Org.acceptsCash ?? invitation.Org.cashPaymentEnabled ?? true,
        bankTransfer: invitation.Org.acceptsBankTransfer ?? invitation.Org.bankTransferEnabled ?? true,
        card: (invitation.Org.acceptsCard ?? false) && !!invitation.Org.stripeConnectAccountId,
        stripe: invitation.Org.stripeEnabled
      },
      bankDetails: {
        accountName: invitation.Org.bankAccountName,
        sortCode: invitation.Org.bankSortCode,
        accountNumber: invitation.Org.bankAccountNumber
      },
      billingDay: invitation.Org.billingDay ?? invitation.Org.feeDueDay ?? null,
      paymentInstructions: invitation.Org.paymentInstructions
    })
  } catch (error: any) {
    logger.error('Error fetching parent invitation', error)
    return NextResponse.json(
      { 
        error: 'Failed to fetch invitation details',
        ...(process.env.NODE_ENV === 'development' && { details: error?.message, stack: error?.stack })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

