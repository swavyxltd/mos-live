export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'

export async function PUT(request: NextRequest) {
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

    // If name changed, update slug automatically (unless slug is explicitly provided)
    let newSlug = slug || org.slug
    if (name && name !== org.name && !slug) {
      // Generate slug from new name
      const baseSlug = name.toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
      
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
        finalSlug = `${baseSlug}-${counter}`
        counter++
      }
      
      newSlug = finalSlug
    }

    // Update organization settings
    const updatedOrg = await prisma.org.update({
      where: { id: org.id },
      data: {
        name,
        slug: newSlug,
        timezone,
        address: address || undefined, // Keep legacy address for backward compatibility
        addressLine1: addressLine1 || undefined,
        postcode: postcode || undefined,
        city: city || undefined,
        phone: phone || undefined,
        publicPhone: publicPhone || undefined,
        email: email || undefined,
        publicEmail: publicEmail || undefined,
        officeHours: officeHours || undefined,
        settings: JSON.stringify({
          lateThreshold
        })
      }
    })

    return NextResponse.json({ 
      success: true, 
      organization: updatedOrg 
    })
  } catch (error) {
    console.error('Error updating organization settings:', error)
    return NextResponse.json(
      { error: 'Failed to update organization settings' },
      { status: 500 }
    )
  }
}

export async function GET() {
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
      address: org.address || '',
      addressLine1: (org as any).addressLine1 || '',
      postcode: (org as any).postcode || '',
      city: (org as any).city || '',
      phone: org.phone || '',
      publicPhone: (org as any).publicPhone || '',
      email: org.email || '',
      publicEmail: (org as any).publicEmail || '',
      officeHours: org.officeHours || ''
    })
  } catch (error) {
    console.error('Error fetching organization settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization settings' },
      { status: 500 }
    )
  }
}
