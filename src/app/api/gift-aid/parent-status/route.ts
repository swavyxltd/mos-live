export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const updateStatusSchema = z.object({
  status: z.enum(['YES', 'NO', 'NOT_SURE'])
})

async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['PARENT'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    // Get parent's Gift Aid status
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        giftAidStatus: true,
        giftAidDeclaredAt: true,
        name: true,
        email: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Calculate total payments if status is YES
    let totalAmount = 0
    if (user.giftAidStatus === 'YES') {
      const payments = await prisma.payment.findMany({
        where: {
          orgId,
          status: 'SUCCEEDED',
          Invoice: {
            Student: {
              primaryParentId: session.user.id
            }
          }
        },
        select: {
          amountP: true
        }
      })

      totalAmount = payments.reduce((sum, p) => sum + (p.amountP / 100), 0)
    }

    return NextResponse.json({
      status: user.giftAidStatus,
      declaredAt: user.giftAidDeclaredAt,
      totalAmount,
      parentName: user.name,
      parentEmail: user.email
    })
  } catch (error: any) {
    logger.error('Get parent gift aid status error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to fetch Gift Aid status',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['PARENT'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    const body = await request.json()
    const { status } = updateStatusSchema.parse(body)

    // Verify user is a parent in this org
    const membership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId
        }
      }
    })

    if (!membership || membership.role !== 'PARENT') {
      return NextResponse.json(
        { error: 'User is not a parent in this organization' },
        { status: 403 }
      )
    }

    // Update user's Gift Aid status
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        giftAidStatus: status,
        giftAidDeclaredAt: new Date()
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        id: randomUUID(),
        orgId,
        actorUserId: session.user.id,
        action: 'UPDATE_GIFT_AID_STATUS',
        targetType: 'User',
        targetId: session.user.id,
        data: JSON.stringify({ status, parentName: updatedUser.name })
      }
    })

    // Calculate total payments if status is YES
    let totalAmount = 0
    if (status === 'YES') {
      const payments = await prisma.payment.findMany({
        where: {
          orgId,
          status: 'SUCCEEDED',
          Invoice: {
            Student: {
              primaryParentId: session.user.id
            }
          }
        },
        select: {
          amountP: true
        }
      })

      totalAmount = payments.reduce((sum, p) => sum + (p.amountP / 100), 0)
    }

    return NextResponse.json({
      status: updatedUser.giftAidStatus,
      declaredAt: updatedUser.giftAidDeclaredAt,
      totalAmount,
      parentName: updatedUser.name,
      parentEmail: updatedUser.email
    })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Update parent gift aid status error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to update Gift Aid status',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const POST = withRateLimit(handlePOST)

