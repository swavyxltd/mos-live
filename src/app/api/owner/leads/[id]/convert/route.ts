import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/api-middleware'
import { sendOrgSetupInvitation } from '@/lib/mail'
import { logger } from '@/lib/logger'
import crypto from 'crypto'

async function handlePOST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (lead.convertedOrgId) {
      return NextResponse.json(
        { error: 'Lead already converted' },
        { status: 400 }
      )
    }

    // Get admin email from request body
    const body = await request.json().catch(() => ({}))
    const adminEmail = body.adminEmail?.trim()

    if (!adminEmail) {
      return NextResponse.json(
        { error: 'Admin email is required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(adminEmail)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Generate slug from org name
    const baseSlug = lead.orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    // Ensure slug is unique
    let slug = baseSlug
    let counter = 1
    while (await prisma.org.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Create the organisation
    const org = await prisma.org.create({
      data: {
        name: lead.orgName,
        slug,
        city: lead.city,
        email: adminEmail,
        phone: lead.contactPhone || undefined,
        status: 'ACTIVE',
      },
    })

    // Create invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    // Create invitation for admin
    // Generate invitation ID using cuid pattern
    const invitationId = `inv_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
    
    await prisma.invitation.create({
      data: {
        id: invitationId,
        orgId: org.id,
        email: adminEmail,
        role: 'ADMIN',
        token,
        expiresAt,
      },
    })

    // Send onboarding email
    try {
      const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'https://app.madrasah.io'
      const cleanBaseUrl = baseUrl.trim().replace(/\/+$/, '')
      const signupUrl = `${cleanBaseUrl}/auth/signup?token=${token}`
      
      logger.info('Sending org setup invitation for converted lead', {
        to: adminEmail,
        orgName: org.name,
        orgId: org.id,
        leadId: params.id,
        hasResendKey: !!process.env.RESEND_API_KEY
      })
      
      await sendOrgSetupInvitation({
        to: adminEmail,
        orgName: org.name,
        signupUrl
      })
      
      logger.info('Org setup invitation email sent successfully', {
        to: adminEmail,
        orgId: org.id
      })
    } catch (emailError: any) {
      logger.error('Failed to send invitation email', emailError, {
        to: adminEmail,
        orgId: org.id
      })
      // Don't fail org creation if email fails, but log it
    }

    // Update lead with converted org
    await prisma.lead.update({
      where: { id: params.id },
      data: {
        convertedOrgId: org.id,
        status: 'WON',
      },
    })

    // Create conversion activity
    await prisma.leadActivity.create({
      data: {
        leadId: params.id,
        type: 'STATUS_CHANGE',
        description: `Lead converted to organisation: ${org.name} (${org.slug})`,
        createdByUserId: session.user.id,
      },
    })

    return NextResponse.json({ 
      org,
      message: 'Lead converted successfully' 
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error converting lead:', error)
    return NextResponse.json(
      { error: 'Failed to convert lead' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

