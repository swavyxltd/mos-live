export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { whatsapp } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/mail'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { generateEmailTemplate } from '@/lib/email-template'
import crypto from 'crypto'

const sendMessageSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(['ALL', 'BY_CLASS', 'INDIVIDUAL']),
  channel: z.enum(['EMAIL', 'WHATSAPP']).optional(),
  classIds: z.array(z.string()).optional(),
  parentId: z.string().optional(),
  targets: z.record(z.any()).optional(),
  saveOnly: z.boolean().optional(), // If true, save to DB without sending emails
  showOnAnnouncements: z.boolean().optional().default(true) // If true, message appears on announcements page
})

async function handlePOST(request: NextRequest) {
  const session = await requireRole(['ADMIN', 'OWNER'])(request)
  if (session instanceof NextResponse) {
    return session
  }
  
  const orgId = await requireOrg(request)
  if (orgId instanceof NextResponse) {
    return orgId
  }
  
  const requestBody = await request.json()
  
  // Validate request body
  let parsedData
  try {
    parsedData = sendMessageSchema.parse(requestBody)
  } catch (validationError: any) {
    logger.error('Message validation error', validationError)
    return NextResponse.json(
      { error: 'Validation error', details: validationError.errors },
      { status: 400 }
    )
  }
  
  const { title, body, audience, channel = 'EMAIL', classIds, parentId, targets, saveOnly = false, showOnAnnouncements = true } = parsedData
  
  // Get recipients based on audience
  let recipients: Array<{ email?: string; phone?: string; name: string; id?: string }> = []
  let audienceDisplayName = ''
  
  if (audience === 'ALL') {
    // Get all parents
    const parents = await prisma.user.findMany({
      where: {
        UserOrgMembership: {
          some: {
            orgId,
            role: 'PARENT'
          }
        }
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true
      }
    })
    recipients = parents
    audienceDisplayName = 'All parents'
  } else if (audience === 'BY_CLASS' && classIds && classIds.length > 0) {
    // Get parents of students in specific classes
    // CRITICAL: Verify classes belong to the authenticated user's org
    const classData = await prisma.class.findFirst({
      where: { 
        id: classIds[0],
        orgId: orgId // CRITICAL: Ensure class belongs to authenticated user's org
      },
      select: { name: true }
    })
    
    if (!classData) {
      return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 404 })
    }
    // CRITICAL: Verify all classIds belong to the authenticated user's org
    const validClasses = await prisma.class.findMany({
      where: {
        id: { in: classIds },
        orgId: orgId // CRITICAL: Ensure all classes belong to authenticated user's org
      },
      select: { id: true }
    })
    
    const validClassIds = validClasses.map(c => c.id)
    if (validClassIds.length !== classIds.length) {
      return NextResponse.json({ error: 'One or more classes not found or unauthorized' }, { status: 403 })
    }
    
    const parents = await prisma.user.findMany({
      where: {
        Student: {
          some: {
            orgId: orgId, // CRITICAL: Ensure students belong to authenticated user's org
            StudentClass: {
              some: {
                classId: { in: validClassIds },
                orgId: orgId // CRITICAL: Ensure enrollments belong to authenticated user's org
              }
            }
          }
        }
      },
      select: {
        id: true,
        email: true,
        phone: true,
        name: true
      }
    })
    recipients = parents
    audienceDisplayName = classData?.name || 'Specific class'
  } else if (audience === 'INDIVIDUAL' && parentId) {
    // Get individual parent - CRITICAL: Verify parent belongs to authenticated user's org
    const membership = await prisma.userOrgMembership.findFirst({
      where: {
        userId: parentId,
        orgId: orgId, // CRITICAL: Ensure parent belongs to authenticated user's org
        role: 'PARENT'
      },
      include: {
        User: {
          select: {
            id: true,
            email: true,
            phone: true,
            name: true
          }
        }
      }
    })
    
    if (!membership) {
      return NextResponse.json({ error: 'Parent not found or unauthorized' }, { status: 404 })
    }
    
    const parent = membership.User
    if (parent) {
      recipients = [parent]
      audienceDisplayName = parent.name || parent.email || 'Individual parent'
    }
  }
  
  // Get org name for WhatsApp formatting
  const org = await prisma.org.findUnique({
    where: { id: orgId },
    select: { name: true }
  })
  
  // Generate unique message ID
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Prepare targets data
  const targetsData: any = {
    audienceDisplayName,
    recipientCount: recipients.length,
    orgName: org?.name || 'Madrasah'
  }
  
  if (targets && typeof targets === 'object') {
    Object.assign(targetsData, targets)
  }
  
  if (audience === 'BY_CLASS' && classIds) {
    targetsData.classIds = classIds
  }
  
  if (audience === 'INDIVIDUAL' && parentId) {
    targetsData.parentId = parentId
  }
  
  // Create message record
  const message = await prisma.message.create({
    data: {
      id: messageId,
      orgId,
      title,
      body,
      audience,
      channel,
      status: 'DRAFT',
      targets: JSON.stringify(targetsData),
      updatedAt: new Date(),
      createdAt: new Date()
    }
  })
  
  // Send messages (only if not saveOnly)
  let successCount = 0
  let failureCount = 0
  
  if (!saveOnly && recipients.length > 0) {
    if (channel === 'EMAIL') {
      // Create org header HTML for branding (org is already fetched above)
      const orgHeaderHtml = org ? `
        <div style="max-width: 100%; margin: 0 auto;">
          <div style="display: inline-block; text-align: left; border-left: 4px solid #22c55e; padding: 0 0 0 16px;">
            <div style="font-size: 16px; font-weight: 600; color: #111827; margin-bottom: 4px; line-height: 1.4;">
              ${org.name}
            </div>
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #6b7280; font-weight: 500;">
              Official Communication
            </div>
          </div>
        </div>
      ` : ''

      // Generate email template once (all emails have same content)
      // This is a significant optimization - template generation includes DB calls for logo
      const orgName = org?.name || 'The Madrasah'
      const html = await generateEmailTemplate({
        title,
        description: body,
        orgHeaderHtml,
        footerText: `Best regards,<br>The ${orgName} Team`,
        showLogo: true
      })
      const textContent = `${title}\n\n${body}\n\nBest regards,\nThe ${orgName} Team`
      
      // Send all emails in parallel using Promise.allSettled
      // This ensures all emails are attempted even if some fail
      const emailRecipients = recipients.filter(r => r.email)
      const emailPromises = emailRecipients.map(async (recipient) => {
        try {
          await sendEmail({
            to: recipient.email!,
            subject: title,
            html,
            text: textContent
          })
          return { success: true, recipient: recipient.email }
        } catch (error) {
          logger.error(`Failed to send email to ${recipient.email}`, error, {
            recipient: recipient.email,
            recipientId: recipient.id
          })
          return { success: false, recipient: recipient.email, error }
        }
      })
      
      // Wait for all emails to complete (success or failure)
      const results = await Promise.allSettled(emailPromises)
      
      // Count successes and failures
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          if (result.value.success) {
            successCount++
          } else {
            failureCount++
          }
        } else {
          // Promise itself was rejected (shouldn't happen, but handle it)
          failureCount++
          logger.error('Email promise rejected', result.reason)
        }
      })
      
      // Handle WhatsApp recipients (if any)
      const whatsappRecipients = recipients.filter(r => r.phone && !r.email)
      successCount += whatsappRecipients.length // WhatsApp sending is disabled, just count as success
    } else if (channel === 'WHATSAPP') {
      // WhatsApp sending is disabled - admin will copy and send manually
      // Just count as success since message is saved to DB
      successCount = recipients.filter(r => r.phone).length
    }
  } else {
    // If saveOnly, mark all as success since we're just saving to DB
    successCount = recipients.length
  }
  
  // Always mark as SENT if message should appear on announcements page
  // If showOnAnnouncements is false, keep as DRAFT so it doesn't appear on announcements
  // Even if email delivery fails, the message is still available in the portal if showOnAnnouncements is true
  const finalStatus = showOnAnnouncements ? 'SENT' : 'DRAFT'
  
  const existingTargetsData = JSON.parse(message.targets || '{}')
  await prisma.message.update({
    where: { id: message.id },
    data: {
      status: finalStatus,
      targets: JSON.stringify({
        ...existingTargetsData,
        recipients: recipients.length,
        successCount,
        failureCount,
        emailDeliveryStatus: failureCount === 0 ? 'success' : failureCount === recipients.length ? 'failed' : 'partial'
      }),
      updatedAt: new Date()
    }
  })
  
  // Log the action
  await prisma.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      orgId,
      actorUserId: session.user.id,
      action: 'SEND_MESSAGE',
      targetType: 'Message',
      targetId: message.id,
      data: JSON.stringify({
        title,
        channel,
        audience,
        recipients: recipients.length,
        successCount,
        failureCount
      })
    }
  })
  
  return NextResponse.json({
    success: true,
    messageId: message.id,
    recipients: recipients.length,
    successCount,
    failureCount
  })
}

export const POST = withRateLimit(handlePOST, { strict: true })
