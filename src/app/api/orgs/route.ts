import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { sendOrgSetupInvitation } from '@/lib/mail'

export async function GET(request: NextRequest) {
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
    console.error('Error fetching organizations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organizations', details: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
    const { name, slug, timezone, description, address, phone, email, website, adminEmail } = body

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'Name and slug are required' },
        { status: 400 }
      )
    }

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required to send invitation' },
        { status: 400 }
      )
    }

    // Create org
    const org = await prisma.org.create({
      data: {
        name,
        slug,
        timezone: timezone || 'Europe/London',
        settings: JSON.stringify({ lateThreshold: 15 }),
        status: 'ACTIVE',
        // Optional fields
        description,
        address,
        phone,
        email,
        website
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
        email: adminEmail,
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
      
      console.log('📧 Attempting to send org setup invitation:', {
        to: adminEmail,
        orgName: name,
        signupUrl,
        hasResendKey: !!process.env.RESEND_API_KEY
      })
      
      await sendOrgSetupInvitation({
        to: adminEmail,
        orgName: name,
        signupUrl
      })
      
      console.log('✅ Org setup invitation email sent successfully')
    } catch (emailError: any) {
      console.error('❌ Failed to send invitation email:', {
        error: emailError,
        message: emailError?.message,
        stack: emailError?.stack
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
    console.error('Error creating organization:', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Organization with this slug already exists' },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create organization', details: error.message },
      { status: 500 }
    )
  }
}

