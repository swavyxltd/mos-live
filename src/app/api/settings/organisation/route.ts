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
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
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
      website,
      officeHours,
      slug, // Allow manual slug update
      billingDay // Explicitly ignore - can only be set via payment-methods route
    } = body

    // billingDay can only be updated through /api/settings/payment-methods
    // Ignore it here to prevent accidental updates

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

    // Always regenerate slug from name and city to ensure city is always included (unless slug is explicitly provided)
    let newSlug = slug
    if (!newSlug) {
      // Get the current city (use updated city if provided, otherwise use existing)
      const currentCity = sanitizedCity || (org as any).city || ''
      
      // Generate slug from name and city (always include city to prevent clashes)
      const nameSlug = (sanitizedName || org.name).toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      
      const citySlug = currentCity 
        ? currentCity.toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
        : ''
      
      // Combine name and city (always include city if available)
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

    // Validate feeDueDay if provided (but note: billingDay should be used instead)
    // Allow null to clear
    if (feeDueDay !== undefined && feeDueDay !== null && (feeDueDay < 1 || feeDueDay > 28)) {
      return NextResponse.json(
        { error: 'Fee due day must be between 1 and 28, or null to clear' },
        { status: 400 }
      )
    }

    // Update organisation settings
    const updatedOrg = await prisma.org.update({
      where: { id: org.id },
      data: {
        ...(sanitizedName && { name: sanitizedName }),
        slug: newSlug,
        ...(timezone && { timezone }),
        ...(feeDueDay !== undefined && { 
          feeDueDay: feeDueDay === null ? null : Math.max(1, Math.min(28, Math.floor(Number(feeDueDay)))),
          billingDay: feeDueDay === null ? null : Math.max(1, Math.min(28, Math.floor(Number(feeDueDay)))) // Keep billingDay in sync with feeDueDay
        }),
        ...(sanitizedAddress !== undefined && { address: sanitizedAddress }),
        ...(sanitizedAddressLine1 !== undefined && { addressLine1: sanitizedAddressLine1 }),
        ...(sanitizedPostcode !== undefined && { postcode: sanitizedPostcode }),
        ...(sanitizedCity !== undefined && { city: sanitizedCity }),
        ...(sanitizedPhone !== undefined && { phone: sanitizedPhone }),
        ...(sanitizedPublicPhone !== undefined && { publicPhone: sanitizedPublicPhone }),
        ...(sanitizedEmail !== undefined && { email: sanitizedEmail }),
        ...(sanitizedPublicEmail !== undefined && { publicEmail: sanitizedPublicEmail }),
        ...(sanitizedOfficeHours !== undefined && { officeHours: sanitizedOfficeHours }),
        settings: (() => {
          // Get existing settings
          const existingSettings = org.settings ? JSON.parse(org.settings) : {}
          const updatedSettings = {
            ...existingSettings,
            lateThreshold: lateThreshold !== undefined ? lateThreshold : existingSettings.lateThreshold || 15
          }
          // Add or remove website
          if (website !== undefined) {
            const sanitizedWebsite = website ? website.trim() : undefined
            if (sanitizedWebsite) {
              updatedSettings.website = sanitizedWebsite
            } else {
              delete updatedSettings.website
            }
          }
          return JSON.stringify(updatedSettings)
        })(),
        updatedAt: new Date()
      }
    })

    return NextResponse.json({ 
      success: true, 
      organisation: updatedOrg 
    })
  } catch (error: any) {
    logger.error('Error updating organisation settings', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update organisation settings',
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
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
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
      website: settings.website || '',
      officeHours: org.officeHours || '',
      bankAccountName: org.bankAccountName || '',
      bankSortCode: org.bankSortCode || '',
      bankAccountNumber: org.bankAccountNumber || ''
    })
  } catch (error: any) {
    logger.error('Error fetching organisation settings', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch organisation settings',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const PUT = withRateLimit(handlePUT)
export const GET = withRateLimit(handleGET)
