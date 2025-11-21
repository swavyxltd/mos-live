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
    end.setHours(23, 59, 59, 999) // Include the entire end date
    
    // Get all successful payments, then filter by Invoice.paidAt date
    // We fetch a broader range first, then filter in memory by actual payment date
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
    
    // Get query param for status filter
    const statusFilter = searchParams.get('status') // 'YES', 'NOT_SURE', 'NO', or null for all
    
    // For NOT_SURE or NO status, return unique parents instead of payments
    if (statusFilter === 'NOT_SURE' || statusFilter === 'NO') {
      // First get parent user IDs in this org
      const parentMemberships = await prisma.userOrgMembership.findMany({
        where: {
          orgId,
          role: 'PARENT'
        },
        select: {
          userId: true
        }
      })
      
      const parentUserIds = parentMemberships.map(m => m.userId)
      
      if (parentUserIds.length === 0) {
        return NextResponse.json({
          data: [],
          total: 0,
          totalAmount: 0
        })
      }
      
      const parentsWithStatus = await prisma.user.findMany({
        where: {
          id: { in: parentUserIds },
          giftAidStatus: statusFilter
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          postcode: true,
          title: true,
          giftAidStatus: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
      
      let giftAidData = parentsWithStatus.map((parent, index) => {
        const nameParts = (parent.name || '').trim().split(/\s+/)
        const firstName = nameParts[0] || ''
        const lastName = nameParts.slice(1).join(' ') || ''
        
        return {
          id: `pending-${parent.id}`,
          title: (parent.title || '').substring(0, 4),
          firstName: firstName.substring(0, 35),
          lastName: lastName.substring(0, 35),
          houseNameOrNumber: (parent.address || '').substring(0, 50),
          postcode: (parent.postcode || '').toUpperCase().trim(),
          aggregatedDonations: '',
          sponsoredEvent: '',
          donationDate: new Date(),
          amount: 0,
          parentName: parent.name || '',
          parentEmail: parent.email || '',
          parentPhone: parent.phone || '',
          giftAidStatus: parent.giftAidStatus || null,
          parentUserId: parent.id
        }
      })
      
      // Demo data is now in the database, so we don't need to generate it here
      
      return NextResponse.json({
        data: giftAidData,
        total: giftAidData.length,
        totalAmount: 0
      })
    }
    
    // Transform payments to gift aid format (for YES status) and aggregate by parent
    const paymentsByParent = new Map<string, {
      parent: {
        id: string
        name: string | null
        email: string
        phone: string | null
        address: string | null
        postcode: string | null
        title: string | null
        giftAidStatus: string | null
      }
      payments: any[]
      totalAmount: number
      earliestDate: Date
    }>()
    
    // Filter and aggregate payments by parent
    for (const payment of payments) {
      try {
        const parent = payment.Invoice?.Student?.User
        if (!parent) continue
        if (parent.giftAidStatus !== 'YES') continue
        
        const parentId = parent.id
        const amount = payment.amountP / 100 // Convert from pence to pounds
        const paymentDate = payment.Invoice?.paidAt || payment.createdAt
        
        if (!paymentDate) continue
        
        if (paymentsByParent.has(parentId)) {
          const existing = paymentsByParent.get(parentId)!
          existing.payments.push(payment)
          existing.totalAmount += amount
          // Keep the earliest payment date
          if (paymentDate < existing.earliestDate) {
            existing.earliestDate = paymentDate
          }
        } else {
          paymentsByParent.set(parentId, {
            parent: {
              id: parent.id,
              name: parent.name,
              email: parent.email,
              phone: parent.phone,
              address: parent.address,
              postcode: parent.postcode,
              title: parent.title,
              giftAidStatus: parent.giftAidStatus
            },
            payments: [payment],
            totalAmount: amount,
            earliestDate: paymentDate
          })
        }
      } catch (err) {
        logger.error('Error processing payment for aggregation', { paymentId: payment.id, error: err })
        continue
      }
    }
    
    // Convert aggregated data to gift aid format
    let giftAidData = Array.from(paymentsByParent.values()).map((aggregated, index) => {
      const parent = aggregated.parent
      if (!parent) {
        logger.error('Missing parent in aggregated data', { index })
        return null
      }
      
      // Parse parent name
      const nameParts = (parent.name || '').trim().split(/\s+/)
      const firstName = nameParts[0] || ''
      const lastName = nameParts.slice(1).join(' ') || ''
      
      return {
        id: `aggregated-${parent.id}-${index}`, // Unique ID for aggregated entry
        title: (parent.title || '').substring(0, 4), // Max 4 chars for title
        firstName: firstName.substring(0, 35), // Max 35 chars
        lastName: lastName.substring(0, 35), // Max 35 chars
        houseNameOrNumber: (parent.address || '').substring(0, 50), // From User model
        postcode: (parent.postcode || '').toUpperCase().trim(), // From User model
        aggregatedDonations: '', // Not aggregated by default
        sponsoredEvent: '', // Not a sponsored event by default
        donationDate: aggregated.earliestDate, // Use earliest payment date
        amount: aggregated.totalAmount, // Sum of all payments
        parentName: parent.name || '',
        parentEmail: parent.email || '',
        parentPhone: parent.phone || '',
        giftAidStatus: parent.giftAidStatus || null,
        parentUserId: parent.id,
        paymentCount: aggregated.payments.length // Track number of payments aggregated
      }
    }).filter((item): item is NonNullable<typeof item> => item !== null)
    
    // Calculate total individual payment count (sum of all paymentCounts)
    const totalPaymentCount = giftAidData.reduce((sum, item) => sum + (item.paymentCount || 0), 0)
    
    // Demo data is now in the database, so we don't need to generate it here
    
    return NextResponse.json({
      data: giftAidData,
      total: giftAidData.length, // Number of unique parents (for table rows)
      totalPaymentCount: totalPaymentCount, // Total number of individual payments
      totalAmount: giftAidData.reduce((sum, item) => sum + item.amount, 0)
    })
  } catch (error: any) {
    logger.error('Get gift aid data error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to fetch gift aid data',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

