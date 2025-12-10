export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidEmail, isValidPhone, isValidUKPostcode, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'

// Save onboarding step data
async function handlePUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Check if user is the initial admin of this org
    const membership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: org.id
        }
      }
    })

    if (!membership || membership.role !== 'ADMIN' || !membership.isInitialAdmin) {
      return NextResponse.json({ error: 'Only the initial admin can complete onboarding' }, { status: 403 })
    }

    const body = await request.json()
    const { step, data } = body

    if (!step || !data) {
      return NextResponse.json({ error: 'Step and data are required' }, { status: 400 })
    }

    let updateData: any = {}

    switch (step) {
      case 'admin':
        // Update admin user details
        if (data.name) {
          updateData.name = sanitizeText(data.name, MAX_STRING_LENGTHS.name)
        }
        if (data.phone) {
          const sanitizedPhone = sanitizeText(data.phone, MAX_STRING_LENGTHS.phone)
          if (!isValidPhone(sanitizedPhone)) {
            return NextResponse.json(
              { error: 'Invalid phone number format. Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)' },
              { status: 400 }
            )
          }
          updateData.phone = sanitizedPhone
        }
        
        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({
            where: { id: session.user.id },
            data: {
              ...updateData,
              updatedAt: new Date()
            }
          })
        }
        break

      case 'organisation':
        // Update organisation details
        if (data.addressLine1) {
          updateData.addressLine1 = sanitizeText(data.addressLine1, MAX_STRING_LENGTHS.text)
        }
        if (data.address) {
          updateData.address = sanitizeText(data.address, MAX_STRING_LENGTHS.text)
        }
        if (data.city) {
          updateData.city = sanitizeText(data.city, MAX_STRING_LENGTHS.name)
        }
        if (data.postcode) {
          const sanitizedPostcode = sanitizeText(data.postcode.toUpperCase().trim(), 20)
          if (!isValidUKPostcode(sanitizedPostcode)) {
            return NextResponse.json(
              { error: 'Invalid postcode format. Please enter a valid UK postcode (e.g., SW1A 1AA)' },
              { status: 400 }
            )
          }
          updateData.postcode = sanitizedPostcode
        }
        if (data.phone) {
          const sanitizedPhone = sanitizeText(data.phone, MAX_STRING_LENGTHS.phone)
          if (!isValidPhone(sanitizedPhone)) {
            return NextResponse.json(
              { error: 'Invalid phone number format. Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)' },
              { status: 400 }
            )
          }
          updateData.phone = sanitizedPhone
        }
        if (data.publicPhone) {
          const sanitizedPhone = sanitizeText(data.publicPhone, MAX_STRING_LENGTHS.phone)
          if (!isValidPhone(sanitizedPhone)) {
            return NextResponse.json(
              { error: 'Invalid public phone number format. Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)' },
              { status: 400 }
            )
          }
          updateData.publicPhone = sanitizedPhone
        }
        if (data.email) {
          const sanitizedEmail = data.email.toLowerCase().trim()
          if (isValidEmail(sanitizedEmail)) {
            updateData.email = sanitizedEmail
          }
        }
        if (data.publicEmail) {
          const sanitizedEmail = data.publicEmail.toLowerCase().trim()
          if (isValidEmail(sanitizedEmail)) {
            updateData.publicEmail = sanitizedEmail
          }
        }
        if (data.officeHours) {
          updateData.officeHours = sanitizeText(data.officeHours, MAX_STRING_LENGTHS.text)
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.org.update({
            where: { id: org.id },
            data: {
              ...updateData,
              updatedAt: new Date()
            }
          })
        }
        break

      case 'payments':
        // Update payment settings
        const paymentUpdateData: any = {}
        
        if (data.acceptsCard !== undefined) {
          paymentUpdateData.acceptsCard = data.acceptsCard
        }
        if (data.acceptsCash !== undefined) {
          paymentUpdateData.acceptsCash = data.acceptsCash
        }
        if (data.acceptsBankTransfer !== undefined) {
          paymentUpdateData.acceptsBankTransfer = data.acceptsBankTransfer
        }
        if (data.billingDay !== undefined) {
          if (data.billingDay < 1 || data.billingDay > 28) {
            return NextResponse.json(
              { error: 'Billing day must be between 1 and 28' },
              { status: 400 }
            )
          }
          paymentUpdateData.billingDay = data.billingDay
        }
        if (data.bankAccountName) {
          paymentUpdateData.bankAccountName = sanitizeText(data.bankAccountName, MAX_STRING_LENGTHS.name)
        }
        if (data.bankSortCode) {
          paymentUpdateData.bankSortCode = sanitizeText(data.bankSortCode, 20)
        }
        if (data.bankAccountNumber) {
          paymentUpdateData.bankAccountNumber = sanitizeText(data.bankAccountNumber, 20)
        }
        if (data.paymentInstructions) {
          paymentUpdateData.paymentInstructions = sanitizeText(data.paymentInstructions, MAX_STRING_LENGTHS.text)
        }

        if (Object.keys(paymentUpdateData).length > 0) {
          await prisma.org.update({
            where: { id: org.id },
            data: {
              ...paymentUpdateData,
              updatedAt: new Date()
            }
          })
        }
        break

      case 'complete':
        // Mark onboarding as complete (you can add an onboardingComplete field to Org if needed)
        // For now, we'll just ensure all required fields are set
        const orgCheck = await prisma.org.findUnique({
          where: { id: org.id },
          select: {
            addressLine1: true,
            city: true,
            postcode: true,
            phone: true,
            email: true,
            publicPhone: true,
            publicEmail: true
          }
        })

        const missingFields = []
        if (!orgCheck?.addressLine1) missingFields.push('Address Line 1')
        if (!orgCheck?.city) missingFields.push('City')
        if (!orgCheck?.postcode) missingFields.push('Postcode')
        if (!orgCheck?.phone) missingFields.push('Contact Phone')
        if (!orgCheck?.email) missingFields.push('Contact Email')
        if (!orgCheck?.publicPhone) missingFields.push('Public Phone')
        if (!orgCheck?.publicEmail) missingFields.push('Public Email')

        if (missingFields.length > 0) {
          return NextResponse.json({
            error: 'Please complete all required fields',
            missingFields
          }, { status: 400 })
        }

        break

      default:
        return NextResponse.json({ error: 'Invalid step' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: `Step ${step} saved successfully`
    })
  } catch (error: any) {
    logger.error('Error saving onboarding step', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to save onboarding step',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

// Get onboarding progress
async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    // Check if user is the initial admin
    const membership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: org.id
        }
      },
      select: {
        isInitialAdmin: true
      }
    })

    if (!membership?.isInitialAdmin) {
      return NextResponse.json({ error: 'Only the initial admin can access onboarding' }, { status: 403 })
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        phone: true
      }
    })

    // Get org details
    const orgData = await prisma.org.findUnique({
      where: { id: org.id },
      select: {
        name: true,
        addressLine1: true,
        address: true,
        city: true,
        postcode: true,
        phone: true,
        publicPhone: true,
        email: true,
        publicEmail: true,
        officeHours: true,
        acceptsCard: true,
        acceptsCash: true,
        acceptsBankTransfer: true,
        billingDay: true,
        bankAccountName: true,
        bankSortCode: true,
        bankAccountNumber: true,
        paymentInstructions: true
      }
    })

    // Determine which steps are complete
    const steps = {
      admin: !!(user?.name && user?.email),
      organisation: !!(orgData?.addressLine1 && orgData?.city && orgData?.postcode && 
                      orgData?.phone && orgData?.email && orgData?.publicPhone && orgData?.publicEmail),
      payments: !!(orgData?.billingDay && (
        orgData?.acceptsCard || orgData?.acceptsCash || orgData?.acceptsBankTransfer
      ))
    }

    return NextResponse.json({
      user,
      organisation: orgData,
      steps,
      isComplete: steps.admin && steps.organisation && steps.payments
    })
  } catch (error: any) {
    logger.error('Error fetching onboarding progress', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to fetch onboarding progress',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const PUT = withRateLimit(handlePUT)
export const GET = withRateLimit(handleGET)

