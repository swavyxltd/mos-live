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
    const { name, timezone, lateThreshold, address, phone, email } = body

    // Update organization settings
    const updatedOrg = await prisma.org.update({
      where: { id: org.id },
      data: {
        name,
        timezone,
        settings: JSON.stringify({
          lateThreshold,
          address,
          phone,
          email
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
      timezone: org.timezone,
      lateThreshold: settings.lateThreshold || 15,
      address: settings.address || '',
      phone: settings.phone || '',
      email: settings.email || ''
    })
  } catch (error) {
    console.error('Error fetching organization settings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization settings' },
      { status: 500 }
    )
  }
}
