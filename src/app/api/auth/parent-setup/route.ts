export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      token,
      password,
      parentName,
      parentPhone,
      emergencyContact,
      studentFirstName,
      studentLastName,
      studentDob,
      studentAllergies,
      studentMedicalNotes,
      paymentMethod
    } = body

    if (!token || !password || !parentName || !paymentMethod) {
      return NextResponse.json(
        { error: 'Missing required fields: token, password, parentName, paymentMethod' },
        { status: 400 }
      )
    }

    // Validate invitation
    const invitation = await prisma.parentInvitation.findUnique({
      where: { token },
      include: {
        student: {
          include: {
            studentClasses: {
              include: {
                class: true
              }
            }
          }
        },
        org: true
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

    // Validate payment method is allowed
    const allowedMethods = []
    if (invitation.org.cashPaymentEnabled) allowedMethods.push('CASH')
    if (invitation.org.bankTransferEnabled) allowedMethods.push('BANK_TRANSFER')
    if (invitation.org.stripeEnabled) allowedMethods.push('STRIPE')

    if (!allowedMethods.includes(paymentMethod)) {
      return NextResponse.json(
        { error: `Payment method ${paymentMethod} is not enabled for this organization` },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Use transaction for data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Find or create parent user
      let parentUser = await tx.user.findUnique({
        where: { email: invitation.parentEmail.toLowerCase() }
      })

      if (!parentUser) {
        parentUser = await tx.user.create({
          data: {
            email: invitation.parentEmail.toLowerCase(),
            name: parentName,
            phone: parentPhone || null,
            password: hashedPassword
          }
        })
      } else {
        // Update existing user
        parentUser = await tx.user.update({
          where: { id: parentUser.id },
          data: {
            name: parentName,
            phone: parentPhone || null,
            password: hashedPassword
          }
        })
      }

      // Ensure parent has membership in org
      const existingMembership = await tx.userOrgMembership.findUnique({
        where: {
          userId_orgId: {
            userId: parentUser.id,
            orgId: invitation.orgId
          }
        }
      })

      if (!existingMembership) {
        await tx.userOrgMembership.create({
          data: {
            userId: parentUser.id,
            orgId: invitation.orgId,
            role: 'PARENT'
          }
        })
      }

      // Link student to parent
      await tx.student.update({
        where: { id: invitation.studentId },
        data: {
          primaryParentId: parentUser.id,
          firstName: studentFirstName || invitation.student.firstName,
          lastName: studentLastName || invitation.student.lastName,
          dob: studentDob ? new Date(studentDob) : invitation.student.dob,
          allergies: studentAllergies || invitation.student.allergies,
          medicalNotes: studentMedicalNotes || invitation.student.medicalNotes
        }
      })

      // Create or update parent billing profile
      await tx.parentBillingProfile.upsert({
        where: {
          orgId_parentUserId: {
            orgId: invitation.orgId,
            parentUserId: parentUser.id
          }
        },
        create: {
          orgId: invitation.orgId,
          parentUserId: parentUser.id,
          preferredPaymentMethod: paymentMethod,
          autoPayEnabled: paymentMethod === 'STRIPE'
        },
        update: {
          preferredPaymentMethod: paymentMethod,
          autoPayEnabled: paymentMethod === 'STRIPE'
        }
      })

      // Update existing pending payment records for this student to use the parent's preferred method
      await tx.monthlyPaymentRecord.updateMany({
        where: {
          orgId: invitation.orgId,
          studentId: invitation.studentId,
          status: 'PENDING',
          method: null
        },
        data: {
          method: paymentMethod
        }
      })

      // Mark invitation as accepted
      await tx.parentInvitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date()
        }
      })

      return { parentUser }
    })

    // If Stripe is selected, return flag to route to Stripe setup
    const needsStripeSetup = paymentMethod === 'STRIPE'

    return NextResponse.json({
      success: true,
      userId: result.parentUser.id,
      email: result.parentUser.email,
      needsStripeSetup
    })
  } catch (error: any) {
    console.error('Error completing parent setup:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to complete parent setup' },
      { status: 500 }
    )
  }
}

