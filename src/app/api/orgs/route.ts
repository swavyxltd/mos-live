import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendOrgSetupInvitation } from '@/lib/mail'
import { logger } from '@/lib/logger'
import { sanitizeText, isValidEmail, isValidPhone, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow authenticated users
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get all active organizations
    const orgs = await prisma.org.findMany({
      where: {
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(orgs)

  } catch (error: any) {
    logger.error('Error fetching organizations', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch organizations',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins to create organizations
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Only platform owners can create organizations.' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, slug, timezone, description, address, addressLine1, postcode, city, phone, email, website, adminEmail } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Sanitize and validate inputs
    const sanitizedName = sanitizeText(name, MAX_STRING_LENGTHS.name)
    const sanitizedDescription = description ? sanitizeText(description, MAX_STRING_LENGTHS.text) : null
    const sanitizedAddress = address ? sanitizeText(address, MAX_STRING_LENGTHS.text) : null
    const sanitizedAddressLine1 = addressLine1 ? sanitizeText(addressLine1, MAX_STRING_LENGTHS.text) : null
    const sanitizedPostcode = postcode ? sanitizeText(postcode, 20) : null
    const sanitizedCity = city ? sanitizeText(city, MAX_STRING_LENGTHS.name) : null
    const sanitizedPhone = phone ? sanitizeText(phone, MAX_STRING_LENGTHS.phone) : null
    const sanitizedEmail = email ? email.toLowerCase().trim() : null
    const sanitizedWebsite = website ? website.trim() : null
    const sanitizedAdminEmail = adminEmail ? adminEmail.toLowerCase().trim() : null

    // Validate emails if provided
    if (sanitizedEmail && !isValidEmail(sanitizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (sanitizedAdminEmail && !isValidEmail(sanitizedAdminEmail)) {
      return NextResponse.json(
        { error: 'Invalid admin email format' },
        { status: 400 }
      )
    }

    if (sanitizedPhone && !isValidPhone(sanitizedPhone)) {
      return NextResponse.json(
        { error: 'Invalid phone number format' },
        { status: 400 }
      )
    }

      // Generate slug from name and city if not provided
      let finalSlug = slug
      if (!finalSlug) {
        const nameSlug = sanitizedName.toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      
        const citySlug = sanitizedCity 
          ? sanitizedCity.toLowerCase()
              .trim()
              .replace(/[^a-z0-9]+/g, '-')
              .replace(/^-+|-+$/g, '')
          : ''
      
      // Combine name and city
      finalSlug = citySlug 
        ? `${nameSlug}-${citySlug}`
        : nameSlug
      
      // Check if slug already exists and append counter if needed
      let counter = 1
      let checkSlug = finalSlug
      while (true) {
        const existingOrg = await prisma.org.findUnique({
          where: { slug: checkSlug },
          select: { id: true }
        })
        
        if (!existingOrg) {
          finalSlug = checkSlug
          break
        }
        
        checkSlug = citySlug 
          ? `${nameSlug}-${citySlug}-${counter}`
          : `${nameSlug}-${counter}`
        counter++
      }
    }

    if (!sanitizedAdminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required to send invitation' },
        { status: 400 }
      )
    }

    // Create org
    const org = await prisma.org.create({
      data: {
        name: sanitizedName,
        slug: finalSlug,
        timezone: timezone || 'Europe/London',
        settings: JSON.stringify({ lateThreshold: 15 }),
        status: 'ACTIVE',
        // Optional fields (only include if they exist in schema)
        address: sanitizedAddress || undefined,
        addressLine1: sanitizedAddressLine1 || undefined,
        postcode: sanitizedPostcode || undefined,
        city: sanitizedCity || undefined,
        phone: sanitizedPhone || undefined,
        email: sanitizedEmail || undefined
        // Note: description and website are not in the Org schema
      }
    })

    // Create invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    // Create invitation for admin
    await prisma.invitation.create({
      data: {
        orgId: org.id,
        email: sanitizedAdminEmail,
        role: 'ADMIN',
        token,
        expiresAt
      }
    })

    // Send invitation email
    try {
      const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
      const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
      const signupUrl = `${cleanBaseUrl}/auth/signup?token=${token}`
      
      logger.info('Sending org setup invitation', {
        to: sanitizedAdminEmail,
        orgName: sanitizedName,
        hasResendKey: !!process.env.RESEND_API_KEY
      })
      
      await sendOrgSetupInvitation({
        to: sanitizedAdminEmail,
        orgName: sanitizedName,
        signupUrl
      })
      
      logger.info('Org setup invitation email sent successfully', {
        to: sanitizedAdminEmail,
        orgId: org.id
      })
    } catch (emailError: any) {
      logger.error('Failed to send invitation email', emailError, {
        to: sanitizedAdminEmail,
        orgId: org.id
      })
      // Don't fail org creation if email fails, but log it
    }

    return NextResponse.json({
      success: true,
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug
      },
      message: 'Organization created and invitation sent'
    })

  } catch (error: any) {
    logger.error('Error creating organization', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Organization with this slug already exists' },
        { status: 400 }
      )
    }

    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to create organization',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const POST = withRateLimit(handlePOST)

