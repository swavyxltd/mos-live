import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { createSetupIntent } from '@/lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const session = await requireRole(['PARENT'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    // Create setup intent
    const setupIntent = await createSetupIntent(orgId, session.user.id)
    
    return NextResponse.json({
      clientSecret: setupIntent.client_secret
    })
  } catch (error) {
    console.error('Setup intent error:', error)
    return NextResponse.json(
      { error: 'Failed to create setup intent' },
      { status: 500 }
    )
  }
}
