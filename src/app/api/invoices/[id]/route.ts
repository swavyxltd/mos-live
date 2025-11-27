export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { getUserRoleInOrg, getActiveOrgId } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { transformInvoiceData } from '@/lib/invoice-data-transform'

async function handleGET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER', 'PARENT'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    // Get user's role in this org (already validated in requireRole, but we need it for filtering)
    const userRole = await getUserRoleInOrg(session.user.id, orgId)
    if (!userRole) {
      logger.error('No user role found after requireRole validation', { userId: session.user.id, orgId })
      return NextResponse.json({ error: 'Failed to get user role' }, { status: 500 })
    }
    
    const invoiceId = params.id
    
    // Build where clause based on user role
    let whereClause: any = { id: invoiceId, orgId }
    
    // If user is a parent, only show invoices for their children
    if (userRole === 'PARENT') {
      whereClause.student = {
        primaryParentId: session.user.id
      }
    }
    
    const invoice = await prisma.invoice.findFirst({
      where: whereClause,
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            primaryParent: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        },
        payments: {
          orderBy: { createdAt: 'desc' }
        }
      }
    })
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    
    // Transform the data for frontend using shared utility for consistency
    const transformedInvoice = transformInvoiceData(invoice)
    
    return NextResponse.json(transformedInvoice)
  } catch (error: any) {
    logger.error('Get invoice error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch invoice',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

async function handlePUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const invoiceId = params.id
    const body = await request.json()
    const { status, amountP, dueDate } = body
    
    // Get the invoice first
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId }
    })
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    
    // Update the invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        ...(status && { status }),
        ...(amountP && { amountP }),
        ...(dueDate && { dueDate: new Date(dueDate) })
      },
      include: {
        student: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId: session.user.id,
        action: 'UPDATE_INVOICE',
        targetType: 'Invoice',
        targetId: invoiceId,
        data: {
          status,
          amountP,
          dueDate
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      invoice: {
        id: updatedInvoice.id,
        invoiceNumber: `INV-${updatedInvoice.id.slice(-8).toUpperCase()}`,
        studentName: `${updatedInvoice.student.firstName} ${updatedInvoice.student.lastName}`,
        amount: updatedInvoice.amountP / 100,
        status: updatedInvoice.status,
        dueDate: updatedInvoice.dueDate
      }
    })
  } catch (error: any) {
    logger.error('Update invoice error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to update invoice',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

async function handleDELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const invoiceId = params.id
    
    // Get the invoice first
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, orgId }
    })
    
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
    }
    
    if (invoice.status === 'PAID') {
      return NextResponse.json(
        { error: 'Cannot delete paid invoice' },
        { status: 400 }
      )
    }
    
    // Delete the invoice
    await prisma.invoice.delete({
      where: { id: invoiceId }
    })
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId: session.user.id,
        action: 'DELETE_INVOICE',
        targetType: 'Invoice',
        targetId: invoiceId,
        data: {
          studentId: invoice.studentId,
          amount: invoice.amountP
        }
      }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    logger.error('Delete invoice error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to delete invoice',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const PUT = withRateLimit(handlePUT)
export const DELETE = withRateLimit(handleDELETE)
