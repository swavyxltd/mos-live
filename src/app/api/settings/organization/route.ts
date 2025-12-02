export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { sanitizeText, MAX_STRING_LENGTHS } from '@/lib/input-validation'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      name, 
      timezone, 
      lateThreshold,
      feeDueDay,
      address, 
      addressLine1,
      postcode,
      city,
      phone, 
      publicPhone,
      email, 
      publicEmail,
      officeHours,
      slug // Allow manual slug update
    } = body

    // Sanitize inputs
    const sanitizedName = name ? sanitizeText(name, MAX_STRING_LENGTHS.name) : undefined
    const sanitizedAddress = address ? sanitizeText(address, MAX_STRING_LENGTHS.text) : undefined
    const sanitizedAddressLine1 = addressLine1 ? sanitizeText(addressLine1, MAX_STRING_LENGTHS.text) : undefined
    const sanitizedPostcode = postcode ? sanitizeText(postcode, 20) : undefined
    const sanitizedCity = city ? sanitizeText(city, MAX_STRING_LENGTHS.name) : undefined
    const sanitizedPhone = phone ? sanitizeText(phone, MAX_STRING_LENGTHS.phone) : undefined
    const sanitizedPublicPhone = publicPhone ? sanitizeText(publicPhone, MAX_STRING_LENGTHS.phone) : undefined
    const sanitizedEmail = email ? email.toLowerCase().trim() : undefined
    const sanitizedPublicEmail = publicEmail ? publicEmail.toLowerCase().trim() : undefined
    const sanitizedOfficeHours = officeHours ? sanitizeText(officeHours, MAX_STRING_LENGTHS.text) : undefined

    // If name or city changed, update slug automatically (unless slug is explicitly provided)
    let newSlug = slug || org.slug
    const currentCity = (org as any).city || ''
    const shouldUpdateSlug = (sanitizedName && sanitizedName !== org.name) || (sanitizedCity && sanitizedCity !== currentCity)
    
    if (shouldUpdateSlug && !slug) {
      // Generate slug from name and city
      const nameSlug = (sanitizedName || org.name).toLowerCase()
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
      const baseSlug = citySlug 
        ? `${nameSlug}-${citySlug}`
        : nameSlug
      
      // Check if slug already exists
      let finalSlug = baseSlug
      let counter = 1
      while (true) {
        const existingOrg = await prisma.org.findUnique({
          where: { slug: finalSlug },
          select: { id: true }
        })
        
        // If slug doesn't exist or belongs to current org, use it
        if (!existingOrg || existingOrg.id === org.id) {
          break
        }
        
        // Otherwise, append counter
        finalSlug = citySlug 
          ? `${nameSlug}-${citySlug}-${counter}`
          : `${nameSlug}-${counter}`
        counter++
      }
      
      newSlug = finalSlug
    }

    // Validate feeDueDay if provided
    if (feeDueDay !== undefined && (feeDueDay < 1 || feeDueDay > 31)) {
      return NextResponse.json(
        { error: 'Fee due day must be between 1 and 31' },
        { status: 400 }
      )
    }

    // Update organization settings
    const updatedOrg = await prisma.org.update({
      where: { id: org.id },
      data: {
        ...(sanitizedName && { name: sanitizedName }),
        slug: newSlug,
        ...(timezone && { timezone }),
        ...(feeDueDay !== undefined && { feeDueDay }),
        ...(sanitizedAddress !== undefined && { address: sanitizedAddress }),
        ...(sanitizedAddressLine1 !== undefined && { addressLine1: sanitizedAddressLine1 }),
        ...(sanitizedPostcode !== undefined && { postcode: sanitizedPostcode }),
        ...(sanitizedCity !== undefined && { city: sanitizedCity }),
        ...(sanitizedPhone !== undefined && { phone: sanitizedPhone }),
        ...(sanitizedPublicPhone !== undefined && { publicPhone: sanitizedPublicPhone }),
        ...(sanitizedEmail !== undefined && { email: sanitizedEmail }),
        ...(sanitizedPublicEmail !== undefined && { publicEmail: sanitizedPublicEmail }),
        ...(sanitizedOfficeHours !== undefined && { officeHours: sanitizedOfficeHours }),
        settings: JSON.stringify({
          lateThreshold
        })
      }
    })

    return NextResponse.json({ 
      success: true, 
      organization: updatedOrg 
    })
  } catch (error: any) {
    logger.error('Error updating organization settings', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update organization settings',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

async function handleGET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const settings = org.settings ? JSON.parse(org.settings) : {}

    return NextResponse.json({
      name: org.name,
      slug: org.slug,
      timezone: org.timezone,
      lateThreshold: settings.lateThreshold || 15,
      feeDueDay: (org as any).feeDueDay || 1,
      address: org.address || '',
      addressLine1: (org as any).addressLine1 || '',
      postcode: (org as any).postcode || '',
      city: (org as any).city || '',
      phone: org.phone || '',
      publicPhone: (org as any).publicPhone || '',
      email: org.email || '',
      publicEmail: (org as any).publicEmail || '',
      officeHours: org.officeHours || '',
      bankAccountName: org.bankAccountName || '',
      bankSortCode: org.bankSortCode || '',
      bankAccountNumber: org.bankAccountNumber || ''
    })
  } catch (error: any) {
    logger.error('Error fetching organization settings', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch organization settings',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const PUT = withRateLimit(handlePUT)
export const GET = withRateLimit(handleGET)
