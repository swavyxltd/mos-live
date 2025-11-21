export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { readFileSync } from 'fs'
import { join } from 'path'

async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const templatePath = join(process.cwd(), 'public', 'gift_aid_schedule__libre_.ods')
    const templateBuffer = readFileSync(templatePath)

    return new NextResponse(templateBuffer, {
      headers: {
        'Content-Type': 'application/vnd.oasis.opendocument.spreadsheet',
        'Content-Disposition': `attachment; filename="gift_aid_schedule__libre_.ods"`
      }
    })
  } catch (error: any) {
    logger.error('Failed to download Gift Aid template', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to download Gift Aid template',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

