export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
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

    // Check for Stripe auto-payment status for each student
    const invoicesWithStripeStatus = await Promise.all(
      invoices.map(async (invoice) => {
        const billingProfile = await prisma.parentBillingProfile.findFirst({
          where: {
            orgId,
            parentUserId: invoice.student.primaryParent?.id
          }
        })

        return {
          ...invoice,
          student: {
            ...invoice.student,
            hasStripeAutoPayment: billingProfile?.autoPayEnabled || false
          }
        }
      })
    )
    
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
  } catch (error) {
    console.error('Get invoices error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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
  } catch (error) {
    console.error('Create invoice error:', error)
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
