import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/mail'
import { generateEmailTemplate } from '@/lib/email-template'
import { withRateLimit } from '@/lib/api-middleware'
import { randomUUID } from 'crypto'

async function handlePOST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Handle Next.js 15+ async params
    const resolvedParams = await Promise.resolve(params)
    const { id } = resolvedParams

    const body = await request.json()
    const { subject, body: emailBody, template } = body

    if (!subject || !emailBody) {
      return NextResponse.json(
        { error: 'Subject and body are required' },
        { status: 400 }
      )
    }

    // Get the lead
    const lead = await prisma.lead.findUnique({
      where: { id },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 })
    }

    if (!lead.contactEmail) {
      return NextResponse.json(
        { error: 'Lead has no email address' },
        { status: 400 }
      )
    }

    // Check if email was already sent today
    if (lead.lastEmailSentAt) {
      const lastSentDate = new Date(lead.lastEmailSentAt)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      lastSentDate.setHours(0, 0, 0, 0)
      
      if (lastSentDate.getTime() === today.getTime()) {
        return NextResponse.json(
          { error: 'You already sent an email to this madrasah today.' },
          { status: 400 }
        )
      }
    }

    // Prevent sending templates that have already been sent
    if (template && template !== 'CUSTOM') {
      const stageOrder = ['INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'FINAL']
      const currentStageIndex = lead.lastEmailStage 
        ? stageOrder.indexOf(lead.lastEmailStage)
        : -1
      const templateIndex = stageOrder.indexOf(template)
      
      // If template is in the sequence and has been sent (current stage is at or past it)
      if (templateIndex !== -1 && currentStageIndex >= templateIndex) {
        return NextResponse.json(
          { error: `This template (${template}) has already been sent. Each template can only be sent once.` },
          { status: 400 }
        )
      }
    }

    // Get owner name for email signature
    const ownerName = session.user.name || 'Madrasah OS'

    // Generate HTML email
    const html = await generateEmailTemplate({
      title: subject,
      description: emailBody.replace(/\n/g, '<br>'),
      footerText: `JazakAllah Khair,<br>${ownerName}<br>Madrasah OS`
    })

    // Send email via Resend
    await sendEmail({
      to: lead.contactEmail,
      subject,
      html,
      text: emailBody
    })

    // Determine next email stage based on template
    // If template is CUSTOM, don't advance the stage
    let nextEmailStage: string | null = lead.lastEmailStage
    
    if (template && template !== 'CUSTOM') {
      // Only advance if sending the next template in sequence
      const stageOrder = ['INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'FINAL']
      const currentStageIndex = lead.lastEmailStage 
        ? stageOrder.indexOf(lead.lastEmailStage)
        : -1
      const templateIndex = stageOrder.indexOf(template)
      
      // Only set nextEmailStage if template is the next one in sequence
      if (templateIndex === currentStageIndex + 1 || (currentStageIndex === -1 && templateIndex === 0)) {
        nextEmailStage = template
      } else {
        // If trying to send out of sequence, use the template as the stage
        // This handles edge cases but shouldn't happen due to validation above
        nextEmailStage = template
      }
    }

    // Calculate next contact date (7 days from now)
    const nextContactDate = new Date()
    nextContactDate.setDate(nextContactDate.getDate() + 7)

    // Update lead
    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        lastEmailSentAt: new Date(),
        lastEmailStage: nextEmailStage,
        lastContactAt: new Date(),
        nextContactAt: nextContactDate,
        emailOutreachCompleted: nextEmailStage === 'FINAL',
        // Auto-update status if it's NEW
        status: lead.status === 'NEW' ? 'CONTACTED' : lead.status,
      },
    })

    // Create activity record
    const activityDescription = template 
      ? `Sent ${template.replace('_', ' ').toLowerCase()} email`
      : 'Sent email'
    
    await prisma.leadActivity.create({
      data: {
        id: randomUUID(),
        leadId: id,
        type: 'EMAIL',
        description: `${activityDescription}: ${subject}`,
        createdByUserId: session.user.id,
      },
    })

    return NextResponse.json({ 
      success: true,
      lead: updatedLead
    })
  } catch (error: any) {
    console.error('Error sending email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)

