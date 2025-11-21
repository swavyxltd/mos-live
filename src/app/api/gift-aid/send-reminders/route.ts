export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { sendEmail } from '@/lib/mail'
import { generateEmailTemplate } from '@/lib/email-template'
import { randomUUID } from 'crypto'

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const body = await request.json()
    const { parentIds, message } = body

    if (!parentIds || !Array.isArray(parentIds) || parentIds.length === 0) {
      return NextResponse.json(
        { error: 'Parent IDs are required' },
        { status: 400 }
      )
    }

    // Get org details
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        email: true
      }
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get parents
    const parents = await prisma.user.findMany({
      where: {
        id: { in: parentIds },
        UserOrgMembership: {
          some: {
            orgId,
            role: 'PARENT'
          }
        }
      },
      select: {
        id: true,
        name: true,
        email: true,
        giftAidStatus: true
      }
    })

    if (parents.length === 0) {
      return NextResponse.json(
        { error: 'No valid parents found' },
        { status: 404 }
      )
    }

    // Send emails
    let successCount = 0
    let failureCount = 0
    const failures: string[] = []

    const defaultMessage = `Assalamu'alaikum,

We hope this message finds you well. We wanted to reach out regarding Gift Aid for your payments to ${org.name}.

Gift Aid allows the madrasah to claim an extra 25% from HMRC on your payments, at no extra cost to you. This means if you pay £100, the madrasah can claim an additional £25 from the government.

To enable Gift Aid, you must be a UK taxpayer and have paid enough Income Tax or Capital Gains Tax to cover the amount the madrasah will claim.

You can update your Gift Aid status by logging into your parent portal and visiting the Gift Aid section.

If you have any questions, please don't hesitate to contact us.

JazakAllah Khair,
The ${org.name} Team`

    const emailSubject = `Gift Aid Reminder - ${org.name}`
    const emailBody = message || defaultMessage

    for (const parent of parents) {
      if (!parent.email) {
        failureCount++
        failures.push(`${parent.name || parent.id}: No email address`)
        continue
      }

      try {
        const html = await generateEmailTemplate({
          title: 'Gift Aid Reminder',
          description: emailBody.replace(/\n/g, '<br>'),
          footerText: `Best regards,<br>The ${org.name} Team`
        })

        await sendEmail({
          to: parent.email,
          subject: emailSubject,
          html,
          text: emailBody
        })

        successCount++

        // Log the action
        await prisma.auditLog.create({
          data: {
            id: randomUUID(),
            orgId,
            actorUserId: session.user.id,
            action: 'SEND_GIFT_AID_REMINDER',
            targetType: 'User',
            targetId: parent.id,
            data: JSON.stringify({ parentName: parent.name, parentEmail: parent.email })
          }
        })
      } catch (error: any) {
        logger.error('Failed to send Gift Aid reminder email', error, {
          parentId: parent.id,
          parentEmail: parent.email
        })
        failureCount++
        failures.push(`${parent.name || parent.id}: ${error.message || 'Failed to send email'}`)
      }
    }

    return NextResponse.json({
      success: true,
      sent: successCount,
      failed: failureCount,
      total: parents.length,
      failures: failures.length > 0 ? failures : undefined
    })
  } catch (error: any) {
    logger.error('Send gift aid reminders error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to send reminders',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

