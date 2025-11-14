export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { whatsapp } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/mail'

const sendMessageSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(['ALL', 'BY_CLASS', 'INDIVIDUAL']),
  channel: z.enum(['EMAIL', 'WHATSAPP']).optional(),
  classIds: z.array(z.string()).optional(),
  parentId: z.string().optional(),
  targets: z.record(z.any()).optional(),
  saveOnly: z.boolean().optional() // If true, save to DB without sending emails
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const requestBody = await request.json()
    const { title, body, audience, channel = 'EMAIL', classIds, parentId, targets, saveOnly = false } = sendMessageSchema.parse(requestBody)
    
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
      const class = await prisma.class.findUnique({
        where: { id: classIds[0] },
        select: { name: true }
      })
      const parents = await prisma.user.findMany({
        where: {
          Student: {
            some: {
              StudentClass: {
                some: {
                  classId: { in: classIds }
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
      audienceDisplayName = class?.name || 'Specific class'
    } else if (audience === 'INDIVIDUAL' && parentId) {
      // Get individual parent
      const parent = await prisma.user.findUnique({
        where: { id: parentId },
        select: {
          id: true,
          email: true,
          phone: true,
          name: true
        }
      })
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
    
    // Create message record with dateSent
    const message = await prisma.message.create({
      data: {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        orgId,
        title,
        body,
        audience,
        channel,
        status: 'DRAFT',
        targets: JSON.stringify({
          ...targets,
          audienceDisplayName,
          recipientCount: recipients.length,
          orgName: org?.name || 'Madrasah',
          classIds: audience === 'BY_CLASS' ? classIds : undefined,
          parentId: audience === 'INDIVIDUAL' ? parentId : undefined
        }),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    })
    
    // Send messages (only if not saveOnly)
    let successCount = 0
    let failureCount = 0
    
    if (!saveOnly) {
      for (const recipient of recipients) {
        try {
          if (channel === 'EMAIL' && recipient.email) {
            const { generateEmailTemplate } = await import('@/lib/email-template')
            const html = await generateEmailTemplate({
              title,
              description: body,
              footerText: 'Best regards, The Madrasah Team'
            })
            
            await sendEmail({
              to: recipient.email,
              subject: title,
              html,
              text: `${title}\n\n${body}\n\nBest regards,\nThe Madrasah Team`
            })
            successCount++
          } else if (channel === 'WHATSAPP' && recipient.phone) {
            // WhatsApp sending is disabled - admin will copy and send manually
            // Just count as success since message is saved to DB
            successCount++
          }
        } catch (error) {
          console.error(`Failed to send ${channel} to ${recipient.email || recipient.phone}:`, error)
          failureCount++
        }
      }
    } else {
      // If saveOnly, mark all as success since we're just saving to DB
      successCount = recipients.length
    }
    
    // Always mark as SENT if message is saved to database (so it appears in parent portal)
    // Even if email delivery fails, the message is still available in the portal
    const finalStatus = 'SENT'
    
    const targetsData = JSON.parse(message.targets || '{}')
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: finalStatus,
        targets: JSON.stringify({
          ...targetsData,
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
        orgId,
        actorUserId: session.user.id,
        action: 'SEND_MESSAGE',
        targetType: 'Message',
        targetId: message.id,
        data: {
          title,
          channel,
          audience,
          recipients: recipients.length,
          successCount,
          failureCount
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      messageId: message.id,
      recipients: recipients.length,
      successCount,
      failureCount
    })
  } catch (error) {
    console.error('Send message error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
