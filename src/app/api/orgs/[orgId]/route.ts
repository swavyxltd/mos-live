import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleDELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> | { orgId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    // Only allow super admins to delete organisations
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      return NextResponse.json(
        { error: 'Unauthorized. Only platform owners can delete organisations.' },
        { status: 401 }
      )
    }

    // Resolve params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params
    const { orgId } = resolvedParams

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organisation ID is required' },
        { status: 400 }
      )
    }

    // Get org info before deletion for logging
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        slug: true
      }
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organisation not found' },
        { status: 404 }
      )
    }

    logger.info(`Deleting organisation: ${org.name} (${org.slug})`)

    // Get counts before deletion for logging
    const [
      students,
      classes,
      invoices,
      memberships,
      applications,
      invitations,
      leads
    ] = await Promise.all([
      prisma.student.count({ where: { orgId } }),
      prisma.class.count({ where: { orgId } }),
      prisma.invoice.count({ where: { orgId } }),
      prisma.userOrgMembership.count({ where: { orgId } }),
      prisma.application.count({ where: { orgId } }),
      prisma.invitation.count({ where: { orgId } }),
      prisma.lead.count({ where: { convertedOrgId: orgId } })
    ])

    logger.info(`Deleting organisation with related data: ${students} students, ${classes} classes, ${invoices} invoices, ${memberships} memberships, ${applications} applications, ${invitations} invitations, ${leads} leads`)

    // Delete leads that reference this org (if any)
    if (leads > 0) {
      await prisma.leadActivity.deleteMany({
        where: {
          lead: {
            convertedOrgId: orgId
          }
        }
      })
      await prisma.lead.deleteMany({
        where: { convertedOrgId: orgId }
      })
    }

    // Delete the organisation
    // Prisma will cascade delete all related records (students, classes, invoices, memberships, etc.)
    await prisma.org.delete({
      where: { id: orgId }
    })

    logger.info(`Organisation ${org.name} deleted successfully with all associated data`)

    return NextResponse.json({
      success: true,
      message: `Organisation "${org.name}" has been deleted`
    })

  } catch (error: any) {
    logger.error('Error deleting organisation', error)
    
    // Handle foreign key constraint errors
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Cannot delete organisation due to existing relationships' },
        { status: 400 }
      )
    }

    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to delete organisation',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const DELETE = withRateLimit(handleDELETE)

