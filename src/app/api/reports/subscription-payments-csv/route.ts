export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

async function handlePOST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { startDate, endDate, month, year } = await request.json()

    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Start date and end date are required' }, { status: 400 })
    }

    // Get the organization for the current user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        organizationMemberships: {
          include: {
            organization: true
          }
        }
      }
    })

    if (!user || user.organizationMemberships.length === 0) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    const org = user.organizationMemberships[0].organization

    // For demo purposes, we'll generate subscription payment data
    // In a real implementation, this would query actual subscription payment records
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ]

    const selectedMonth = monthNames[month]
    const filename = `subscription-payments-${selectedMonth}-${year}.csv`

    // Generate demo subscription payment data
    const subscriptionPayments = [
      {
        studentName: 'Ahmed Hassan',
        parentName: 'Mohammed Ali',
        parentEmail: 'mohammed.ali@email.com',
        parentPhone: '+44 7700 900001',
        paymentMethod: 'Bank Transfer',
        paymentDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        amount: '1.00'
      },
      {
        studentName: 'Aisha Khan',
        parentName: 'Sarah Khan',
        parentEmail: 'sarah.khan@email.com',
        parentPhone: '+44 7700 900002',
        paymentMethod: 'Card Payment',
        paymentDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        amount: '1.00'
      },
      {
        studentName: 'Fatima Ali',
        parentName: 'Hassan Ali',
        parentEmail: 'hassan.ali@email.com',
        parentPhone: '+44 7700 900003',
        paymentMethod: 'Bank Transfer',
        paymentDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        amount: '1.00'
      },
      {
        studentName: 'Yusuf Patel',
        parentName: 'Priya Patel',
        parentEmail: 'priya.patel@email.com',
        parentPhone: '+44 7700 900004',
        paymentMethod: 'Cash',
        paymentDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        amount: '1.00'
      },
      {
        studentName: 'Maryam Ali',
        parentName: 'Fatima Ali',
        parentEmail: 'fatima.ali@email.com',
        parentPhone: '+44 7700 900005',
        paymentMethod: 'Bank Transfer',
        paymentDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        amount: '1.00'
      },
      {
        studentName: 'Omar Ahmed',
        parentName: 'Khalid Ahmed',
        parentEmail: 'khalid.ahmed@email.com',
        parentPhone: '+44 7700 900006',
        paymentMethod: 'Card Payment',
        paymentDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        amount: '1.00'
      },
      {
        studentName: 'Zainab Patel',
        parentName: 'Ahmed Patel',
        parentEmail: 'ahmed.patel@email.com',
        parentPhone: '+44 7700 900007',
        paymentMethod: 'Cash',
        paymentDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        amount: '1.00'
      },
      {
        studentName: 'Ibrahim Khan',
        parentName: 'Mohammed Khan',
        parentEmail: 'mohammed.khan@email.com',
        parentPhone: '+44 7700 900008',
        paymentMethod: 'Bank Transfer',
        paymentDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        amount: '1.00'
      },
      {
        studentName: 'Amina Khan',
        parentName: 'Sarah Khan',
        parentEmail: 'sarah.khan@email.com',
        parentPhone: '+44 7700 900009',
        paymentMethod: 'Card Payment',
        paymentDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        amount: '1.00'
      },
      {
        studentName: 'Khalid Ahmed',
        parentName: 'Omar Ahmed',
        parentEmail: 'omar.ahmed@email.com',
        parentPhone: '+44 7700 900010',
        paymentMethod: 'Bank Transfer',
        paymentDate: `${year}-${String(month + 1).padStart(2, '0')}-01`,
        amount: '1.00'
      }
    ]

    // Create CSV content
    const csvHeader = `Subscription Payments Report - ${selectedMonth} ${year}\nStudent Name,Parent Name,Parent Email,Parent Phone,Payment Method,Payment Date,Amount (GBP)\n`
    
    const csvRows = subscriptionPayments.map(payment => 
      `"${payment.studentName}","${payment.parentName}","${payment.parentEmail}","${payment.parentPhone}","${payment.paymentMethod}","${payment.paymentDate}","${payment.amount}"`
    ).join('\n')

    const csvContent = csvHeader + csvRows

    // Create response with CSV file
    const response = new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

    return response

  } catch (error: any) {
    logger.error('Error generating subscription payments CSV', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to generate subscription payments CSV',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handlePOST)
