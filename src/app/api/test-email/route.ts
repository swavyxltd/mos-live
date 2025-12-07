import { NextRequest, NextResponse } from 'next/server'
import { sendEmail } from '@/lib/mail'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins or in development
    if (process.env.NODE_ENV === 'production' && (!session?.user?.isSuperAdmin)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { to, subject = 'Test Email from Madrasah OS' } = body

    if (!to) {
      return NextResponse.json(
        { error: 'Email address (to) is required' },
        { status: 400 }
      )
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #111827;">Test Email</h1>
        <p>This is a test email from Madrasah OS.</p>
        <p>If you received this, email sending is working correctly!</p>
        <p style="color: #6b7280; font-size: 12px; margin-top: 40px;">
          Sent at: ${new Date().toISOString()}
        </p>
      </div>
    `

    const result = await sendEmail({
      to,
      subject,
      html,
      text: 'This is a test email from Madrasah OS. If you received this, email sending is working correctly!'
    })

    return NextResponse.json({
      success: true,
      message: 'Test email sent successfully',
      emailId: result?.id,
      details: {
        to,
        subject,
        sentAt: new Date().toISOString()
      }
    })
  } catch (error: any) {
    console.error('Test email error:', error)
    return NextResponse.json(
      {
        error: 'Failed to send test email',
        message: error?.message,
        details: process.env.NODE_ENV === 'development' ? {
          stack: error?.stack,
          name: error?.name
        } : undefined
      },
      { status: 500 }
    )
  }
}

