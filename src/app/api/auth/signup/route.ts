import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendOrgSetupConfirmation, sendStaffInvitation } from '@/lib/mail'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      token,
      name,
      email,
      password,
      phone,
      // Org details (for new org setup)
      orgAddress,
      orgAddressLine1,
      orgPostcode,
      orgCity,
      orgPhone,
      orgPublicPhone,
      orgEmail,
      orgPublicEmail,
      orgWebsite,
      timezone
    } = body

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      )
    }

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Name, email, and password are required' },
        { status: 400 }
      )
    }

    // Validate invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        org: true
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      )
    }

    // Check if invitation has expired
    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    // Check if invitation has already been accepted
    if (invitation.acceptedAt) {
      return NextResponse.json(
        { error: 'Invitation has already been accepted' },
        { status: 400 }
      )
    }

    // Verify email matches invitation (if invitation has email)
    if (invitation.email && invitation.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Email does not match invitation' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create or update user
      const user = await tx.user.upsert({
        where: { email: email.toLowerCase() },
        update: {
          name,
          password: hashedPassword,
          phone: phone || null,
          updatedAt: new Date()
        },
        create: {
          email: email.toLowerCase(),
          name,
          password: hashedPassword,
          phone: phone || null,
          isSuperAdmin: false
        }
      })

      // Check if this is a new org setup (role might be 'ADMIN' for new org)
      const isNewOrgSetup = invitation.role === 'ADMIN' && !invitation.acceptedAt

      // Update org details if this is a new org setup
      if (isNewOrgSetup) {
        // Validate required fields for new org setup
        if (!orgAddressLine1 || !orgPostcode || !orgCity || !orgPhone || !orgPublicPhone || !orgEmail || !orgPublicEmail) {
          throw new Error('All organization details are required: address line 1, postcode, city, contact phone, public phone, contact email, and public email')
        }
        
        await tx.org.update({
          where: { id: invitation.orgId },
          data: {
            address: orgAddress || undefined, // Legacy field
            addressLine1: orgAddressLine1,
            postcode: orgPostcode,
            city: orgCity,
            phone: orgPhone,
            publicPhone: orgPublicPhone,
            email: orgEmail,
            publicEmail: orgPublicEmail,
            website: orgWebsite || undefined,
            timezone: timezone || 'Europe/London'
          }
        })
      }

      // Create user-org membership
      await tx.userOrgMembership.upsert({
        where: {
          userId_orgId: {
            userId: user.id,
            orgId: invitation.orgId
          }
        },
        update: {
          role: invitation.role
        },
        create: {
          userId: user.id,
          orgId: invitation.orgId,
          role: invitation.role
        }
      })

      // Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date()
        }
      })

      return { user, org: invitation.org, isNewOrgSetup }
    })

    // Send confirmation email
    try {
      const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
      const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
      
      if (result.isNewOrgSetup) {
        // Send org setup confirmation email
        await sendOrgSetupConfirmation({
          to: email,
          orgName: result.org.name,
          dashboardUrl: `${cleanBaseUrl}/dashboard`
        })
      }
    } catch (emailError) {
      console.error('Failed to send confirmation email:', emailError)
      // Don't fail the signup if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      userId: result.user.id,
      orgId: result.org.id,
      orgName: result.org.name
    })
  } catch (error: any) {
    console.error('Error creating account:', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create account', details: error.message },
      { status: 500 }
    )
  }
}

