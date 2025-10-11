import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { whatsapp } from '@/lib/whatsapp'
import { sendEmail } from '@/lib/mail'

const sendMessageSchema = z.object({
  title: z.string().min(1),
  body: z.string().min(1),
  audience: z.enum(['ALL', 'BY_CLASS']),
  channel: z.enum(['EMAIL', 'WHATSAPP']),
  classIds: z.array(z.string()).optional(),
  targets: z.record(z.any()).optional()
})

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const requestBody = await request.json()
    const { title, body, audience, channel, classIds, targets } = sendMessageSchema.parse(requestBody)
    
    // Create message record
    const message = await prisma.message.create({
      data: {
        orgId,
        title,
        body,
        audience,
        channel,
        status: 'DRAFT',
        targets: targets || {}
      }
    })
    
    // Get recipients based on audience
    let recipients: Array<{ email?: string; phone?: string; name: string }> = []
    
    if (audience === 'ALL') {
      // Get all parents
      const parents = await prisma.user.findMany({
        where: {
          memberships: {
            some: {
              orgId,
              role: 'PARENT'
            }
          }
        },
        select: {
          email: true,
          phone: true,
          name: true
        }
      })
      recipients = parents
    } else if (audience === 'BY_CLASS' && classIds) {
      // Get parents of students in specific classes
      const parents = await prisma.user.findMany({
        where: {
          students: {
            some: {
              studentClasses: {
                some: {
                  classId: { in: classIds }
                }
              }
            }
          }
        },
        select: {
          email: true,
          phone: true,
          name: true
        }
      })
      recipients = parents
    }
    
    // Send messages
    let successCount = 0
    let failureCount = 0
    
    for (const recipient of recipients) {
      try {
        if (channel === 'EMAIL' && recipient.email) {
          await sendEmail({
            to: recipient.email,
            subject: title,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>${title}</h2>
                <p>${body}</p>
                <p>Best regards,<br>The Madrasah Team</p>
              </div>
            `,
            text: `${title}\n\n${body}\n\nBest regards,\nThe Madrasah Team`
          })
          successCount++
        } else if (channel === 'WHATSAPP' && recipient.phone) {
          await whatsapp.sendAnnouncement(recipient.phone, title, body)
          successCount++
        }
      } catch (error) {
        console.error(`Failed to send ${channel} to ${recipient.email || recipient.phone}:`, error)
        failureCount++
      }
    }
    
    // Update message status
    const finalStatus = failureCount === 0 ? 'SENT' : failureCount === recipients.length ? 'FAILED' : 'SENT'
    
    await prisma.message.update({
      where: { id: message.id },
      data: {
        status: finalStatus,
        targets: {
          ...targets,
          recipients: recipients.length,
          successCount,
          failureCount
        }
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
