export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import crypto from 'crypto'

async function handlePOST(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    // Get active fees plans
    const feesPlans = await prisma.feesPlan.findMany({
      where: { orgId, isActive: true }
    })
    
    if (feesPlans.length === 0) {
      return NextResponse.json({ error: 'No active fees plans found' }, { status: 400 })
    }
    
    // Get all active (non-archived) students
    const students = await prisma.student.findMany({
      where: { 
        orgId,
        isArchived: false
      }
    })
    
    if (students.length === 0) {
      return NextResponse.json({ error: 'No students found' }, { status: 400 })
    }
    
    // Get org feeDueDay setting
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: { feeDueDay: true }
    })
    const orgFeeDueDay = (org as any)?.feeDueDay || 1
    
    const now = new Date()
    // Calculate due date based on org feeDueDay for next month
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, orgFeeDueDay)
    const dueDate = nextMonth
    
    const createdInvoices = []
    
    // Generate invoices for each student and fees plan
    for (const student of students) {
      for (const feesPlan of feesPlans) {
        // Check if invoice already exists for this month
        const existingInvoice = await prisma.invoice.findFirst({
          where: {
            orgId,
            studentId: student.id,
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), 1),
              lt: new Date(now.getFullYear(), now.getMonth() + 1, 1)
            }
          }
        })
        
        if (existingInvoice) {
          continue // Skip if invoice already exists
        }
        
        const invoice = await prisma.invoice.create({
          data: {
            id: crypto.randomUUID(),
            orgId,
            studentId: student.id,
            amountP: feesPlan.amountP,
            updatedAt: new Date()
            dueDate,
            status: 'DRAFT'
          }
        })
        
        createdInvoices.push(invoice)
      }
    }
    
    // Log the action
    await prisma.auditLog.create({
      data: {
        orgId,
        actorUserId: session.user.id,
        action: 'GENERATE_MONTHLY_INVOICES',
        targetType: 'Invoice',
        data: {
          invoiceCount: createdInvoices.length,
          month: now.getMonth() + 1,
          year: now.getFullYear()
        }
      }
    })
    
    return NextResponse.json({ 
      success: true, 
      created: createdInvoices.length,
      invoices: createdInvoices.map(inv => ({ id: inv.id, studentId: inv.studentId, amount: inv.amountP }))
    })
  } catch (error: any) {
    logger.error('Generate monthly invoices error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to generate invoices',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
