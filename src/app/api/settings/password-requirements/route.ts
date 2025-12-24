import { NextRequest, NextResponse } from 'next/server'
import { getPasswordRequirements } from '@/lib/password-validation'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const requirements = await getPasswordRequirements()
    
    // Convert to a format that's easier for frontend to use
    const requirementsData = requirements.map(req => ({
      text: req.text,
      required: req.required
    }))

    return NextResponse.json({
      requirements: requirementsData
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Failed to fetch password requirements' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)












