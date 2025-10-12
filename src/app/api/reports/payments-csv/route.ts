import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { requireRole } from '@/lib/roles'

export async function POST(request: NextRequest) {
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

    // Demo payment data - in a real app, this would come from your database
    const allPayments = [
      // October 2025 payments
      {
        studentName: 'Ahmed Hassan',
        parentName: 'Mohammed Hassan',
        parentEmail: 'mohammed.hassan@example.com',
        parentPhone: '+44 7700 900123',
        paymentMethod: 'Bank Transfer',
        paymentDate: '2025-10-01',
        amount: 50.00,
        class: 'Quran Recitation - Level 1'
      },
      {
        studentName: 'Fatima Ali',
        parentName: 'Aisha Ali',
        parentEmail: 'aisha.ali@example.com',
        parentPhone: '+44 7700 900124',
        paymentMethod: 'Cash',
        paymentDate: '2025-10-02',
        amount: 50.00,
        class: 'Islamic Studies - Level 2'
      },
      {
        studentName: 'Yusuf Patel',
        parentName: 'Priya Patel',
        parentEmail: 'priya.patel@example.com',
        parentPhone: '+44 7700 900125',
        paymentMethod: 'Card Payment',
        paymentDate: '2025-10-03',
        amount: 25.00,
        class: 'Arabic Grammar'
      },
      {
        studentName: 'Aisha Khan',
        parentName: 'Sarah Khan',
        parentEmail: 'sarah.khan@example.com',
        parentPhone: '+44 7700 900126',
        paymentMethod: 'Bank Transfer',
        paymentDate: '2025-10-04',
        amount: 50.00,
        class: 'Quran Recitation - Level 1'
      },
      {
        studentName: 'Omar Ahmed',
        parentName: 'Hassan Ahmed',
        parentEmail: 'hassan.ahmed@example.com',
        parentPhone: '+44 7700 900127',
        paymentMethod: 'Cash',
        paymentDate: '2025-10-05',
        amount: 50.00,
        class: 'Islamic Studies - Level 2'
      },
      {
        studentName: 'Maryam Ali',
        parentName: 'Fatima Ali',
        parentEmail: 'fatima.ali@example.com',
        parentPhone: '+44 7700 900128',
        paymentMethod: 'Card Payment',
        paymentDate: '2025-10-06',
        amount: 50.00,
        class: 'Arabic Grammar'
      },
      {
        studentName: 'Ibrahim Khan',
        parentName: 'Mohammed Khan',
        parentEmail: 'mohammed.khan@example.com',
        parentPhone: '+44 7700 900129',
        paymentMethod: 'Bank Transfer',
        paymentDate: '2025-10-07',
        amount: 50.00,
        class: 'Quran Recitation - Level 1'
      },
      {
        studentName: 'Zainab Patel',
        parentName: 'Ahmed Patel',
        parentEmail: 'ahmed.patel@example.com',
        parentPhone: '+44 7700 900130',
        paymentMethod: 'Cash',
        paymentDate: '2025-10-08',
        amount: 50.00,
        class: 'Islamic Studies - Level 2'
      },
      // September 2025 payments
      {
        studentName: 'Hassan Ali',
        parentName: 'Mohammed Ali',
        parentEmail: 'mohammed.ali@example.com',
        parentPhone: '+44 7700 900131',
        paymentMethod: 'Bank Transfer',
        paymentDate: '2025-09-15',
        amount: 50.00,
        class: 'Quran Recitation - Level 1'
      },
      {
        studentName: 'Amina Khan',
        parentName: 'Sarah Khan',
        parentEmail: 'sarah.khan@example.com',
        parentPhone: '+44 7700 900132',
        paymentMethod: 'Card Payment',
        paymentDate: '2025-09-20',
        amount: 50.00,
        class: 'Islamic Studies - Level 2'
      },
      // August 2025 payments
      {
        studentName: 'Khalid Ahmed',
        parentName: 'Omar Ahmed',
        parentEmail: 'omar.ahmed@example.com',
        parentPhone: '+44 7700 900133',
        paymentMethod: 'Cash',
        paymentDate: '2025-08-10',
        amount: 50.00,
        class: 'Arabic Grammar'
      },
      {
        studentName: 'Layla Patel',
        parentName: 'Priya Patel',
        parentEmail: 'priya.patel@example.com',
        parentPhone: '+44 7700 900134',
        paymentMethod: 'Bank Transfer',
        paymentDate: '2025-08-25',
        amount: 50.00,
        class: 'Quran Recitation - Level 1'
      }
    ]

    // Filter payments based on date range if provided
    let filteredPayments = allPayments
    if (startDate && endDate) {
      filteredPayments = allPayments.filter(payment => {
        const paymentDate = new Date(payment.paymentDate)
        const start = new Date(startDate)
        const end = new Date(endDate)
        return paymentDate >= start && paymentDate <= end
      })
    }

    // Filter by class if provided
    if (classId) {
      filteredPayments = filteredPayments.filter(payment => 
        payment.class.toLowerCase().includes(classId.toLowerCase())
      )
    }

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

  } catch (error) {
    console.error('Error generating payment CSV:', error)
    return NextResponse.json(
      { error: 'Failed to generate payment report' },
      { status: 500 }
    )
  }
}
