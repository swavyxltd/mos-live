export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'

// RFC4180 CSV escaping
function escapeCsv(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const str = String(value).trim()
  
  // If contains comma, quote, or newline, wrap in quotes and escape quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

// Check if postcode is valid UK format
function isValidUKPostcode(postcode: string | null): boolean {
  if (!postcode) return false
  const ukPostcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i
  return ukPostcodePattern.test(postcode.trim())
}

// Format date as DD/MM/YYYY
function formatDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = String(date.getFullYear())
  return `${day}/${month}/${year}`
}

// Truncate string to max length
function truncate(str: string, maxLength: number): string {
  return str.substring(0, maxLength)
}

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
    
    // Get all successful payments within the date range
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
                    title: true,
                    address: true,
                    postcode: true,
                    giftAidStatus: true
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })
    
    // Filter to only payments where parent has Gift Aid status YES
    const eligiblePayments = payments.filter(payment => {
      const parent = payment.Invoice?.Student?.User
      return parent && parent.giftAidStatus === 'YES'
    })
    
    if (eligiblePayments.length === 0) {
      return NextResponse.json(
        { error: 'No payments found for the selected date range with Gift Aid status YES' },
        { status: 404 }
      )
    }
    
    // Build CSV rows - one row per donation (NOT aggregated)
    const rows: string[] = []
    
    for (const payment of eligiblePayments) {
      const parent = payment.Invoice?.Student?.User
      if (!parent) continue
      
      // Parse name
      const nameParts = (parent.name || '').trim().split(/\s+/).filter(p => p.length > 0)
      const firstName = truncate(nameParts[0] || '', 35)
      const lastName = truncate(nameParts.slice(1).join(' ') || '', 35)
      
      // Title from User.title field
      const title = truncate((parent.title || '').trim(), 4)
      
      // Address - first line only, up to first comma or newline
      let houseLine1 = ''
      if (parent.address) {
        const lines = parent.address.split(/\n|\r\n?/).filter((line: string) => line.trim().length > 0)
        if (lines.length > 0) {
          houseLine1 = lines[0].trim()
          // Take only part before first comma
          const commaIndex = houseLine1.indexOf(',')
          if (commaIndex > 0) {
            houseLine1 = houseLine1.substring(0, commaIndex).trim()
          }
        }
      }
      houseLine1 = truncate(houseLine1, 50)
      
      // Postcode - uppercase, blank if not valid UK format
      let postcode = ''
      if (parent.postcode) {
        const upperPostcode = parent.postcode.toUpperCase().trim()
        if (isValidUKPostcode(upperPostcode)) {
          postcode = upperPostcode
        }
        // If not valid UK format, leave blank (not 'X')
      }
      
      // Donation date from Invoice.paidAt (DD/MM/YYYY)
      const paidAt = payment.Invoice?.paidAt || payment.createdAt
      const donationDate = formatDate(paidAt)
      
      // Amount in pounds (payment.amountP / 100) formatted as 0.00
      const amount = (payment.amountP / 100).toFixed(2)
      
      // Build row with exactly 9 columns
      const row = [
        escapeCsv(title),           // 1. Title
        escapeCsv(firstName),       // 2. First name
        escapeCsv(lastName),        // 3. Last name
        escapeCsv(houseLine1),     // 4. House name or number
        escapeCsv(postcode),        // 5. Postcode
        '',                         // 6. Aggregated donations (blank)
        '',                         // 7. Sponsored event (blank)
        escapeCsv(donationDate),    // 8. Donation date (DD/MM/YYYY)
        escapeCsv(amount)           // 9. Amount
      ].join(',')
      
      rows.push(row)
    }
    
    // Join rows with newlines (no blank rows, no trailing newline)
    const csv = rows.join('\n')
    
    // Generate filename
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthName = monthNames[end.getMonth()]
    const year = end.getFullYear()
    const filename = `gift_aid_${monthName}_${year}.csv`
    
    // Save submission record to database
    const totalAmount = eligiblePayments.reduce((sum, p) => sum + (p.amountP / 100), 0)
    const totalCount = eligiblePayments.length
    
    try {
      await (prisma as any).giftAidSubmission.create({
        data: {
          orgId,
          generatedById: session.user.id,
          startDate: start,
          endDate: end,
          totalAmount,
          totalCount,
          filename
        }
      })
    } catch (error) {
      // Log error but don't fail the download
      logger.error('Failed to save Gift Aid submission record', error)
    }
    
    // Return CSV file (no BOM, no extra headers)
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error: any) {
    logger.error('Generate Gift Aid CSV error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to generate Gift Aid CSV',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

