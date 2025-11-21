export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole } from '@/lib/roles'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { getActiveOrg } from '@/lib/org'

async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has permission to generate financial reports
    const hasPermission = await requireRole(['ADMIN', 'STAFF'], session.user.id)
    if (!hasPermission) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get request body for date range filters
    const body = await request.json()
    const { startDate, endDate, classId } = body

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Fetch payments from database
    const whereClause: any = {
      orgId: org.id,
      status: 'SUCCEEDED'
    }

    if (startDate && endDate) {
      whereClause.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      }
    }

    if (classId) {
      whereClause.Invoice = {
        Student: {
          StudentClass: {
            some: {
              classId: classId
            }
          }
        }
      }
    }

    const payments = await prisma.payment.findMany({
      where: whereClause,
      include: {
        Invoice: {
          include: {
            Student: {
              include: {
                User: {
                  select: {
                    name: true,
                    email: true,
                    phone: true
                  }
                },
                StudentClass: {
                  include: {
                    Class: {
                      select: {
                        name: true
                      }
                    }
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

    // Transform payments to match expected format
    const allPayments = payments.map(payment => {
      const student = payment.Invoice?.Student
      const parent = student?.User
      const classNames = student?.StudentClass?.map(sc => sc.Class.name).join(', ') || 'N/A'
      
      return {
        studentName: student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        parentName: parent?.name || 'Unknown',
        parentEmail: parent?.email || '',
        parentPhone: parent?.phone || '',
        paymentMethod: payment.method === 'STRIPE' ? 'Card Payment' : payment.method === 'BANK_TRANSFER' ? 'Bank Transfer' : payment.method === 'CASH' ? 'Cash' : payment.method,
        paymentDate: payment.createdAt.toISOString().split('T')[0],
        amount: payment.amountP / 100, // Convert from pence to pounds
        class: classNames
      }
    })

    // All payments now come from database - no hardcoded data

    // Payments are already filtered by the database query
    const filteredPayments = allPayments

    // Generate CSV content
    const csvHeaders = [
      'Student Name',
      'Parent Name', 
      'Parent Email',
      'Parent Phone Number',
      'Payment Method',
      'Payment Date',
      'Amount (£)',
      'Class'
    ]

    const csvRows = filteredPayments.map(payment => [
      payment.studentName,
      payment.parentName,
      payment.parentEmail,
      payment.parentPhone,
      payment.paymentMethod,
      payment.paymentDate,
      payment.amount.toFixed(2),
      payment.class
    ])

    // Add month information header
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]
    
    let monthHeader = ''
    if (startDate && endDate) {
      const startDateObj = new Date(startDate)
      const month = monthNames[startDateObj.getMonth()]
      const year = startDateObj.getFullYear()
      monthHeader = `Payment Report for ${month} ${year}\n`
    }

    // Combine month header, headers and rows
    const csvContent = [
      monthHeader,
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(field => `"${field}"`).join(','))
    ].join('\n')

    // Generate filename with month name
    let filename = 'payment-report.csv'
    if (startDate && endDate) {
      const startDateObj = new Date(startDate)
      const month = monthNames[startDateObj.getMonth()]
      const year = startDateObj.getFullYear()
      filename = `payment-report-${month}-${year}.csv`
    }

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    })

  } catch (error: any) {
    logger.error('Error generating payment CSV', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to generate payment report',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
