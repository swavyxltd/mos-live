import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { withRateLimit } from '@/lib/api-middleware'
import { sendOrgSetupInvitation } from '@/lib/mail'
import { logger } from '@/lib/logger'
import crypto from 'crypto'
import { randomUUID } from 'crypto'

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  let leadId: string | undefined
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle params - in Next.js 15+, params can be a Promise
    const resolvedParams = params instanceof Promise ? await params : params
    const { id } = resolvedParams
    leadId = id
    
    if (!id) {
      return NextResponse.json({ error: 'Lead ID is required' }, { status: 400 })
    }

    const lead = await prisma.lead.findUnique({
      where: { id },
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
    let baseSlug = lead.orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    // Fallback if slug is empty
    if (!baseSlug) {
      baseSlug = `org-${Date.now()}`
    }
    
    // Ensure slug is unique
    let slug = baseSlug
    let counter = 1
    while (await prisma.org.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`
      counter++
    }

    // Create the organisation
    const now = new Date()
    const org = await prisma.org.create({
      data: {
        id: randomUUID(),
        name: lead.orgName,
        slug,
        timezone: 'Europe/London',
        settings: JSON.stringify({ lateThreshold: 15 }),
        city: lead.city || undefined,
        email: adminEmail,
        phone: lead.contactPhone || undefined,
        status: 'ACTIVE',
        updatedAt: now,
      },
    })

    // Create invitation token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

    // Create invitation for admin
    // Generate invitation ID using cuid pattern
    const invitationId = `inv_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`
    
    logger.info('Creating invitation', {
      invitationId,
      orgId: org.id,
      email: adminEmail,
      tokenLength: token.length,
      tokenPrefix: token.substring(0, 8),
      expiresAt
    })
    
    const invitation = await prisma.invitation.create({
      data: {
        id: invitationId,
        orgId: org.id,
        email: adminEmail,
        role: 'ADMIN',
        token,
        expiresAt,
      },
    })
    
    logger.info('Invitation created successfully', {
      invitationId: invitation.id,
      orgId: invitation.orgId,
      tokenLength: invitation.token.length,
      tokenPrefix: invitation.token.substring(0, 8)
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
        leadId: id,
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
      where: { id },
      data: {
        convertedOrgId: org.id,
        status: 'WON',
      },
    })

    // Create conversion activity
    await prisma.leadActivity.create({
      data: {
        id: randomUUID(),
        leadId: id,
        type: 'STATUS_CHANGE',
        description: `Lead converted to organisation: ${org.name} (${org.slug})`,
        createdByUserId: session.user.id,
      },
    })

    logger.info('Lead converted successfully', {
      leadId: id,
      orgId: org.id,
      orgName: org.name,
      orgSlug: org.slug,
      status: org.status
    })

    return NextResponse.json({ 
      org: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        status: org.status
      },
      message: 'Lead converted successfully' 
    }, { status: 201 })
  } catch (error: any) {
    logger.error('Error converting lead', error, {
      leadId: leadId || 'unknown',
      errorCode: error?.code,
      errorMessage: error?.message
    })
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to convert lead',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

