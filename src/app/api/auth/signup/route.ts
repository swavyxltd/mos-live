import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { sendOrgSetupConfirmation, sendStaffInvitation } from '@/lib/mail'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidEmail, isValidPhone, isValidUKPostcode, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'
import { validatePassword } from '@/lib/password-validation'

async function handlePOST(request: NextRequest) {
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

    // Validate password against platform settings
    const passwordValidation = await validatePassword(password)
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        { error: passwordValidation.errors.join('. ') },
        { status: 400 }
      )
    }

    // Sanitize and validate inputs
    const sanitizedEmail = email.toLowerCase().trim()
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const sanitizedName = sanitizeText(name, MAX_STRING_LENGTHS.name)
    const sanitizedPhone = phone ? sanitizeText(phone, MAX_STRING_LENGTHS.phone) : null

    if (sanitizedPhone && !isValidPhone(sanitizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format. Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)' },
        { status: 400 }
      )
    }

    // Validate invitation
    const invitation = await prisma.invitation.findUnique({
      where: { token },
      include: {
        Org: true
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
    if (invitation.email && invitation.email.toLowerCase() !== sanitizedEmail) {
      return NextResponse.json(
        { error: 'Email does not match invitation' },
        { status: 400 }
      )
    }

    // Check if user already exists - block ALL existing emails
    const existingUser = await prisma.user.findUnique({
      where: { email: sanitizedEmail },
      select: {
        id: true,
        isSuperAdmin: true
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'This email is already registered. Please use a different email or sign in with your existing account.' },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Start transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user (email already validated as unique above)
      const user = await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          email: sanitizedEmail,
          name: sanitizedName,
          password: hashedPassword,
          phone: sanitizedPhone,
          isSuperAdmin: false,
          updatedAt: new Date()
        }
      })

      // Check if this is a new org setup (role might be 'ADMIN' for new org)
      const isNewOrgSetup = invitation.role === 'ADMIN' && !invitation.acceptedAt

      // Update org details if this is a new org setup
      if (isNewOrgSetup) {
        // Validate required fields for new org setup
        if (!orgAddressLine1 || !orgPostcode || !orgCity || !orgPhone || !orgPublicPhone || !orgEmail || !orgPublicEmail) {
          throw new Error('All organisation details are required: address line 1, postcode, city, contact phone, public phone, contact email, and public email')
        }
        
        // Sanitize org fields
        const sanitizedOrgAddressLine1 = sanitizeText(orgAddressLine1, MAX_STRING_LENGTHS.text)
        const sanitizedOrgPostcode = sanitizeText(orgPostcode.toUpperCase().trim(), 20)
        const sanitizedOrgCity = sanitizeText(orgCity, MAX_STRING_LENGTHS.name)
        const sanitizedOrgPhone = sanitizeText(orgPhone, MAX_STRING_LENGTHS.phone)
        const sanitizedOrgPublicPhone = sanitizeText(orgPublicPhone, MAX_STRING_LENGTHS.phone)
        
        const sanitizedOrgEmail = orgEmail.toLowerCase().trim()
        const sanitizedOrgPublicEmail = orgPublicEmail.toLowerCase().trim()
        const sanitizedOrgWebsite = orgWebsite ? orgWebsite.trim() : undefined
        
        // Validate postcode
        if (!isValidUKPostcode(sanitizedOrgPostcode)) {
          throw new Error('Invalid postcode format. Please enter a valid UK postcode (e.g., SW1A 1AA)')
        }
        
        // Validate org emails
        if (!isValidEmail(sanitizedOrgEmail)) {
          throw new Error('Invalid organisation contact email format')
        }
        if (!isValidEmail(sanitizedOrgPublicEmail)) {
          throw new Error('Invalid organisation public email format')
        }
        
        // Validate org phones
        if (!isValidPhone(sanitizedOrgPhone)) {
          throw new Error('Invalid phone number format. Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)')
        }
        if (!isValidPhone(sanitizedOrgPublicPhone)) {
          throw new Error('Invalid public phone number format. Please enter a valid UK phone number (e.g., +44 7700 900123 or 07700 900123)')
        }
        
        // Get existing org settings and slug
        const existingOrg = await tx.org.findUnique({
          where: { id: invitation.orgId },
          select: { settings: true, slug: true, name: true }
        })
        
        let orgSettings: any = {}
        if (existingOrg?.settings) {
          try {
            orgSettings = JSON.parse(existingOrg.settings)
          } catch (e) {
            // If parsing fails, start with default settings
            orgSettings = { lateThreshold: 15 }
          }
        } else {
          orgSettings = { lateThreshold: 15 }
        }
        
        // Add website to settings if provided
        if (sanitizedOrgWebsite) {
          orgSettings.website = sanitizedOrgWebsite
        }
        
        // Always generate slug from org name and city to ensure it includes city (prevents clashes)
        const orgName = existingOrg?.name || 'madrasah'
        const nameSlug = orgName.toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
        
        const citySlug = sanitizedOrgCity 
          ? sanitizedOrgCity.toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          : ''
        
        // Combine name and city (always include city to prevent slug clashes)
        const baseSlug = citySlug 
          ? `${nameSlug}-${citySlug}`
          : nameSlug
        
        // Check if slug already exists and append counter if needed
        let orgSlug = baseSlug
        let counter = 1
        while (true) {
          const existingOrgWithSlug = await tx.org.findUnique({
            where: { slug: orgSlug },
            select: { id: true }
          })
          
          // If slug doesn't exist or belongs to current org, use it
          if (!existingOrgWithSlug || existingOrgWithSlug.id === invitation.orgId) {
            break
          }
          
          // Otherwise, append counter
          orgSlug = citySlug 
            ? `${nameSlug}-${citySlug}-${counter}`
            : `${nameSlug}-${counter}`
          counter++
        }
        
        await tx.org.update({
          where: { id: invitation.orgId },
          data: {
            address: orgAddress ? sanitizeText(orgAddress, MAX_STRING_LENGTHS.text) : undefined, // Legacy field
            addressLine1: sanitizedOrgAddressLine1,
            postcode: sanitizedOrgPostcode,
            city: sanitizedOrgCity,
            phone: sanitizedOrgPhone,
            publicPhone: sanitizedOrgPublicPhone,
            email: sanitizedOrgEmail,
            publicEmail: sanitizedOrgPublicEmail,
            timezone: timezone || 'Europe/London',
            settings: JSON.stringify(orgSettings),
            slug: orgSlug,
            updatedAt: new Date()
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
          id: crypto.randomUUID(),
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

      // Fetch the org (may have been updated in transaction)
      const org = await tx.org.findUnique({
        where: { id: invitation.orgId }
      })

      if (!org) {
        throw new Error('Organisation not found')
      }

      return { user, org, isNewOrgSetup }
    })

    // Send confirmation email
    try {
      const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
      const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
      
      if (result.isNewOrgSetup) {
        // Send org setup confirmation email
        await sendOrgSetupConfirmation({
          to: sanitizedEmail,
          orgName: result.org.name,
          dashboardUrl: `${cleanBaseUrl}/dashboard`
        })
      }
    } catch (emailError: any) {
      logger.error('Failed to send confirmation email', emailError)
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
    logger.error('Error creating account', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'This email is already being used. Please use a different one.' },
        { status: 400 }
      )
    }

    // Return the actual error message if it's a validation error (status 400)
    // Otherwise return generic error message for server errors (status 500)
    const errorMessage = error?.message || 'Failed to create account'
    const isValidationError = errorMessage.includes('Invalid') || 
                               errorMessage.includes('required') ||
                               errorMessage.includes('format')
    
    return NextResponse.json(
      { 
        error: isValidationError ? errorMessage : 'Failed to create account',
        ...(process.env.NODE_ENV === 'development' && { details: error?.message, stack: error?.stack })
      },
      { status: isValidationError ? 400 : 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

