export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER', 'PARENT'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const studentId = searchParams.get('studentId')
    
    // Build where clause based on user role
    let whereClause: any = { orgId }
    
    // If user is a parent, only show invoices for their children
    if (session.user.role === 'PARENT') {
      whereClause.student = {
        primaryParentId: session.user.id
      }
    }
    
    // Add status filter if provided
    if (status) {
      whereClause.status = status
    }
    
    // Add student filter if provided
    if (studentId) {
      whereClause.studentId = studentId
    }
    
    const invoices = await prisma.invoice.findMany({
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
          where: { status: 'SUCCEEDED' },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Optimize: Batch fetch all billing profiles to avoid N+1 queries
    const parentIds = invoices
      .map(inv => inv.student.primaryParent?.id)
      .filter((id): id is string => !!id)
    
    const billingProfiles = parentIds.length > 0
      ? await prisma.parentBillingProfile.findMany({
          where: {
            orgId,
            parentUserId: { in: parentIds }
          },
          select: {
            parentUserId: true,
            autoPayEnabled: true
          }
        })
      : []
    
    const billingProfileMap = new Map(
      billingProfiles.map(bp => [bp.parentUserId, bp.autoPayEnabled])
    )

    // Map billing profiles to invoices
    const invoicesWithStripeStatus = invoices.map((invoice) => {
      const hasStripeAutoPayment = invoice.student.primaryParent?.id
        ? billingProfileMap.get(invoice.student.primaryParent.id) || false
        : false

      return {
        ...invoice,
        student: {
          ...invoice.student,
          hasStripeAutoPayment
        }
      }
    })
    
    // Transform the data for frontend
    const transformedInvoices = invoicesWithStripeStatus.map(invoice => ({
      id: invoice.id,
      invoiceNumber: `INV-${invoice.id.slice(-8).toUpperCase()}`,
      studentName: `${invoice.student.firstName} ${invoice.student.lastName}`,
      parentName: invoice.student.primaryParent?.name || 'N/A',
      parentEmail: invoice.student.primaryParent?.email || 'N/A',
      amount: invoice.amountP / 100, // Convert from pence to pounds
      currency: 'GBP',
      status: invoice.status,
      dueDate: invoice.dueDate,
      paidDate: invoice.paidAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
      payments: invoice.payments.map(payment => ({
        id: payment.id,
        method: payment.method,
        amount: payment.amountP / 100,
        status: payment.status,
        createdAt: payment.createdAt
      })),
      student: {
        id: invoice.student.id,
        hasStripeAutoPayment: invoice.student.hasStripeAutoPayment
      }
    }))
    
    return NextResponse.json(transformedInvoices)
  } catch (error: any) {
    logger.error('Get payments error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch payments',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const body = await request.json()
    const { studentId, amountP, dueDate, description } = body
    
    // Validate required fields
    if (!studentId || !amountP || !dueDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // Create the invoice
    const invoice = await prisma.invoice.create({
      data: {
        orgId,
        studentId,
        amountP,
        dueDate: new Date(dueDate),
        status: 'DRAFT'
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
        action: 'CREATE_INVOICE',
        targetType: 'Invoice',
        targetId: invoice.id,
        data: {
          studentId,
          amount: amountP,
          dueDate
        }
      }
    })
    
    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: `INV-${invoice.id.slice(-8).toUpperCase()}`,
        studentName: `${invoice.student.firstName} ${invoice.student.lastName}`,
        amount: invoice.amountP / 100,
        status: invoice.status,
        dueDate: invoice.dueDate
      }
    })
  } catch (error: any) {
    logger.error('Create payment error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to create payment',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
export const POST = withRateLimit(handlePOST)
