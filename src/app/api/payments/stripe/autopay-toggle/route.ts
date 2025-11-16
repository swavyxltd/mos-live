export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

const autopayToggleSchema = z.object({
  enabled: z.boolean()
})

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['PARENT'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const body = await request.json()
    const { enabled } = autopayToggleSchema.parse(body)
    
    // Update parent billing profile
    const profile = await prisma.parentBillingProfile.upsert({
      where: {
        orgId_parentUserId: {
          orgId,
          parentUserId: session.user.id
        }
      },
      update: {
        autoPayEnabled: enabled
      },
      create: {
        orgId,
        parentUserId: session.user.id,
        autoPayEnabled: enabled
      }
    })
    
    return NextResponse.json({
      success: true,
      autoPayEnabled: profile.autoPayEnabled
    })
  } catch (error: any) {
    logger.error('Autopay toggle error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update autopay setting',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
