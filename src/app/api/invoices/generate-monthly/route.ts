export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
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
    
    const now = new Date()
    const dueDate = new Date(now)
    dueDate.setMonth(dueDate.getMonth() + 1)
    dueDate.setDate(1) // First day of next month
    
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
            orgId,
            studentId: student.id,
            amountP: feesPlan.amountP,
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
  } catch (error) {
    console.error('Generate monthly invoices error:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoices' },
      { status: 500 }
    )
  }
}
