import { NextRequest, NextResponse } from 'next/server'
import { requireAuth, requireOrg } from '@/lib/roles'
import { generateICS } from '@/lib/calendar'

export async function GET(request: NextRequest) {
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
  } catch (error) {
    console.error('ICS export error:', error)
    return NextResponse.json(
      { error: 'Failed to generate calendar export' },
      { status: 500 }
    )
  }
}
