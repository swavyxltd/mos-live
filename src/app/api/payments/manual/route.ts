export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/roles'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['OWNER', 'ADMIN', 'FINANCE_OFFICER'])(request)
    if (session instanceof NextResponse) return session

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    const body = await request.json()
    const { invoiceId, paymentMethod, amount, notes, paymentDate } = body

    // Validate required fields
    if (!invoiceId || !paymentMethod || !amount) {
      return NextResponse.json(
        { error: 'Invoice ID, payment method, and amount are required' },
        { status: 400 }
      )
    }

    // Validate payment method
    if (!['CASH', 'BANK_TRANSFER'].includes(paymentMethod)) {
      return NextResponse.json(
        { error: 'Payment method must be CASH or BANK_TRANSFER' },
        { status: 400 }
      )
    }

    // Get invoice and verify it belongs to the organisation
    const invoice = await prisma.invoice.findFirst({
      where: { 
        id: invoiceId, 
        orgId: org.id,
        status: { not: 'PAID' }
      },
      include: {
        student: {
          include: {
            primaryParent: true
          }
        }
      }
    })

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found or already paid' }, { status: 404 })
    }

    // Validate amount matches invoice amount (with tolerance for rounding)
    const amountP = Math.round(amount * 100) // Convert to pence
    if (Math.abs(amountP - invoice.amountP) > 1) { // Allow 1 pence tolerance for rounding
      return NextResponse.json(
        { error: `Payment amount must match invoice amount of £${(invoice.amountP / 100).toFixed(2)}` },
        { status: 400 }
      )
    }

    // Create payment record (use validated amountP)
    const payment = await prisma.payment.create({
      data: {
        id: crypto.randomUUID(),
        orgId: org.id,
        invoiceId: invoice.id,
        method: paymentMethod,
        amountP: amountP, // Use validated amount in pence
        status: 'COMPLETED',
        updatedAt: new Date(),
        meta: JSON.stringify({
          notes: notes || '',
          recordedBy: session.user.id,
          recordedAt: new Date().toISOString(),
          paymentDate: paymentDate || new Date().toISOString()
        })
      }
    })

    // Update invoice status
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        paidMethod: paymentMethod
      }
    })

    return NextResponse.json({
      success: true,
      payment: {
        id: payment.id,
        method: payment.method,
        amount: payment.amountP,
        status: payment.status,
        createdAt: payment.createdAt
      },
      invoice: {
        id: invoice.id,
        status: 'PAID',
        paidAt: new Date()
      }
    })
  } catch (error) {
    logger.error('Error recording manual payment', error)
    return NextResponse.json(
      { error: 'Failed to record payment' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST, { strict: true })

async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['OWNER', 'ADMIN', 'FINANCE_OFFICER'])(request)
    if (session instanceof NextResponse) return session

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const method = searchParams.get('method')

    // Get pending invoices for manual payment tracking
    const invoices = await prisma.invoice.findMany({
      where: {
        orgId: org.id,
        status: status === 'PENDING' ? 'PENDING' : status === 'OVERDUE' ? 'OVERDUE' : 'PENDING',
        ...(method && { paidMethod: method })
      },
      include: {
        Student: {
          include: {
            User: true
          }
        },
        Payment: {
          where: {
            method: { in: ['CASH', 'BANK_TRANSFER'] }
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      }
    })

    return NextResponse.json({
      invoices: invoices.map(invoice => ({
        id: invoice.id,
        invoiceNumber: `INV-${invoice.id.slice(-6).toUpperCase()}`,
        amount: invoice.amountP,
        dueDate: invoice.dueDate,
        status: invoice.status,
        student: {
          id: invoice.Student.id,
          firstName: invoice.Student.firstName,
          lastName: invoice.Student.lastName
        },
        parent: {
          id: invoice.Student.User.id,
          name: invoice.Student.User.name,
          email: invoice.Student.User.email
        },
        payments: invoice.Payment.map(payment => ({
          id: payment.id,
          method: payment.method,
          amount: payment.amountP,
          status: payment.status,
          createdAt: payment.createdAt,
          meta: payment.meta ? JSON.parse(payment.meta) : null
        }))
      }))
    })
  } catch (error) {
    logger.error('Error fetching manual payments', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)
