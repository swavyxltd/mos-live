import { NextRequest, NextResponse } from 'next/server'
import { sendParentOnboardingEmail } from '@/lib/mail'

export async function POST(request: NextRequest) {
  try {
    const { email, orgName, studentName, setupUrl } = await request.json()
    
    if (!email || !orgName || !studentName || !setupUrl) {
      return NextResponse.json(
        { error: 'Missing required fields: email, orgName, studentName, setupUrl' },
        { status: 400 }
      )
    }
    
    await sendParentOnboardingEmail({
      to: email,
      orgName,
      studentName,
      setupUrl
    })
    
    return NextResponse.json({ 
      success: true, 
      message: `Test email sent to ${email}` 
    })
  } catch (error: any) {
    console.error('Error sending test email:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to send test email' },
      { status: 500 }
    )
  }
}

