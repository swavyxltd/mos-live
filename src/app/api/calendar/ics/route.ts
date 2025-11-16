export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOrg } from '@/lib/roles'
import { generateICS } from '@/lib/calendar'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await requireAuth(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const { searchParams } = new URL(request.url)
    const months = parseInt(searchParams.get('months') || '12')
    
    // Generate ICS content
    const icsContent = await generateICS(orgId, months)
    
    // Return as downloadable file
    return new NextResponse(icsContent, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="madrasah-calendar-${orgId}.ics"`
      }
    })
  } catch (error: any) {
    logger.error('ICS export error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to generate calendar export',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
