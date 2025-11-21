export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['ADMIN', 'OWNER'])(request)
    if (session instanceof NextResponse) return session
    
    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId
    
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Start date and end date are required' },
        { status: 400 }
      )
    }
    
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)
    
    // Get all successful payments within the date range (filter by Invoice.paidAt)
    const payments = await prisma.payment.findMany({
      where: {
        orgId,
        status: 'SUCCEEDED',
        Invoice: {
          paidAt: {
            gte: start,
            lte: end
          }
        }
      },
      include: {
        Invoice: {
          include: {
            Student: {
              include: {
                User: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true,
                    postcode: true,
                    title: true,
                    giftAidStatus: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Filter and aggregate payments by parent
    const paymentsByParent = new Map<string, {
      parent: any,
      payments: any[],
      totalAmount: number,
      earliestDate: Date
    }>()
    
    for (const payment of payments) {
      const parent = payment.Invoice?.Student?.User
      if (!parent) continue
      if (parent.giftAidStatus !== 'YES') continue
      
      const parentId = parent.id
      const amount = payment.amountP / 100
      const paymentDate = payment.Invoice?.paidAt || payment.createdAt
      
      if (!paymentDate) continue
      
      if (paymentsByParent.has(parentId)) {
        const existing = paymentsByParent.get(parentId)!
        existing.payments.push(payment)
        existing.totalAmount += amount
        if (paymentDate < existing.earliestDate) {
          existing.earliestDate = paymentDate
        }
      } else {
        paymentsByParent.set(parentId, {
          parent,
          payments: [payment],
          totalAmount: amount,
          earliestDate: paymentDate
        })
      }
    }
    
    if (paymentsByParent.size === 0) {
      return NextResponse.json(
        { error: 'No payments found for the selected date range with Gift Aid status YES' },
        { status: 404 }
      )
    }
    
    // Convert to CSV format
    const csvRows = []
    
    // Header row
    csvRows.push([
      'Item',
      'Title',
      'First Name',
      'Last Name',
      'House Name or Number',
      'Postcode',
      'Aggregated Donations',
      'Sponsored Event',
      'Donation Date (DD/MM/YY)',
      'Amount'
    ].join(','))
    
    // Data rows
    Array.from(paymentsByParent.values()).forEach((aggregated, index) => {
      const parent = aggregated.parent!
      
      const nameParts = (parent.name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      const date = aggregated.earliestDate
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      const formattedDate = `${day}/${month}/${year}`
      
      const row = [
        index + 1,
        `"${(parent.title || '').substring(0, 4)}"`,
        `"${firstName.substring(0, 35)}"`,
        `"${lastName.substring(0, 35)}"`,
        `"${(parent.address || '').substring(0, 50)}"`,
        `"${(parent.postcode || '').toUpperCase().trim()}"`,
        '""',
        '""',
        formattedDate,
        aggregated.totalAmount.toFixed(2)
      ].join(',')
      
      csvRows.push(row)
    })
    
    const csvContent = csvRows.join('\n')
    
    // Generate filename
    const startStr = start.toISOString().split('T')[0]
    const endStr = end.toISOString().split('T')[0]
    const filename = `Gift-Aid-Schedule-${startStr}-to-${endStr}.csv`
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error: any) {
    logger.error('Export CSV error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to export CSV',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

