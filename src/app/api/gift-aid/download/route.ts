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
    
    // Filter payments and aggregate by parent
    const paymentsByParent = new Map<string, {
      parent: any,
      payments: any[],
      totalAmount: number,
      earliestDate: Date
    }>()
    
    // Filter and aggregate payments by parent
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
        // Keep the earliest payment date
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
    
    // Handle empty result - demo data should be in database
    if (paymentsByParent.size === 0) {
      return NextResponse.json(
        { error: 'No payments found for the selected date range with Gift Aid status YES' },
        { status: 404 }
      )
    }
    
    
    // Helper function to check if postcode is UK format
    const isUKPostcode = (postcode: string | null): boolean => {
      if (!postcode) return false
      // UK postcode pattern: letters, numbers, space, letters/numbers
      const ukPostcodePattern = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i
      return ukPostcodePattern.test(postcode.trim())
    }

    // Helper function to trim and clean values (HMRC rule: no leading/trailing spaces)
    const cleanValue = (value: string | null | undefined, maxLength?: number): string => {
      if (!value) return '' // Leave blank if not applicable (HMRC rule)
      const cleaned = value.trim()
      return maxLength ? cleaned.substring(0, maxLength) : cleaned
    }

    // Convert aggregated data to gift aid format for Excel
    // HMRC Rule: When adding together donations from the same donor, leave aggregated donations column blank
    const giftAidRows = Array.from(paymentsByParent.values())
      .map((aggregated, index) => {
        const parent = aggregated.parent!
        
        // Parse parent name - split into first and last name
        const nameParts = cleanValue(parent.name || '').split(/\s+/).filter(p => p.length > 0)
        let firstName = nameParts[0] || ''
        let lastName = nameParts.slice(1).join(' ') || ''
        
        // If only one name part, use it as first name and leave last name empty
        if (nameParts.length === 1) {
          firstName = nameParts[0] || ''
          lastName = ''
        }
        
        // Format date as DD/MM/YY - use earliest payment date
        const date = aggregated.earliestDate
        const day = String(date.getDate()).padStart(2, '0')
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const year = String(date.getFullYear()).slice(-2)
        const formattedDate = `${day}/${month}/${year}`
        
        // Format amount to 2 decimal places (will be stored as number in Excel)
        const formattedAmount = aggregated.totalAmount
        
        // Clean address - only use first line (house name/number, not city)
        // Split by newline or comma and take first part
        let address = parent.address || ''
        if (address) {
          // Split by newline first, then by comma if no newline
          const lines = address.split(/\n|\r\n?/).filter((line: string) => line.trim().length > 0)
          if (lines.length > 0) {
            address = lines[0].trim()
            // If first line contains comma, take only the part before first comma
            const commaIndex = address.indexOf(',')
            if (commaIndex > 0) {
              address = address.substring(0, commaIndex).trim()
            }
          }
        }
        address = cleanValue(address, 50)
        
        // Handle postcode (HMRC rule: UK donors need postcode, non-UK get 'X')
        let postcode = cleanValue(parent.postcode)
        if (postcode) {
          postcode = postcode.toUpperCase()
          // If not UK format, set to 'X' for non-UK donors
          if (!isUKPostcode(postcode)) {
            postcode = 'X'
          }
        } else if (address && !isUKPostcode(postcode)) {
          // If we have an address but no valid UK postcode, assume non-UK
          postcode = 'X'
        }
        
        return {
          item: index + 1,
          title: cleanValue(parent.title, 4), // Max 4 chars, trimmed
          firstName: cleanValue(firstName, 35), // Max 35 chars, trimmed
          lastName: cleanValue(lastName, 35), // Max 35 chars, trimmed
          houseNameOrNumber: address, // Max 50 chars, trimmed
          postcode: postcode, // Trimmed, 'X' for non-UK
          aggregatedDonations: '', // Empty for same donor (HMRC rule)
          sponsoredEvent: '', // Empty for regular donations (HMRC rule: leave blank if not applicable)
          donationDate: formattedDate,
          amount: formattedAmount // Store as number for proper Excel formatting
        }
      })
      .filter(row => {
        // HMRC rule: Don't leave blank rows between donations
        // Include all rows, even with missing data (they'll be blank but not removed)
        return true
      })
    
    // HMRC Rule: Maximum 1,000 rows of donations
    if (giftAidRows.length > 1000) {
      return NextResponse.json(
        { error: `Too many donations (${giftAidRows.length}). HMRC limit is 1,000 rows. Please reduce the date range.` },
        { status: 400 }
      )
    }
    
    // Helper function to format date as DD/MM/YY
    const formatDate = (date: Date) => {
      const day = String(date.getDate()).padStart(2, '0')
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const year = String(date.getFullYear()).slice(-2)
      return `${day}/${month}/${year}`
    }
    
    // Helper function to parse DD/MM/YY date string
    const parseDate = (dateStr: string | Date): Date => {
      if (dateStr instanceof Date) return dateStr
      // Parse DD/MM/YY format
      const parts = dateStr.split('/')
      if (parts.length === 3) {
        const day = parseInt(parts[0], 10)
        const month = parseInt(parts[1], 10) - 1 // Month is 0-indexed
        const year = 2000 + parseInt(parts[2], 10) // Assume 20XX for YY
        return new Date(year, month, day)
      }
      return new Date(dateStr)
    }
    
    // Helper function to escape CSV values (only quote if contains comma, newline, or quote)
    const escapeCsvValue = (value: string | number | null | undefined): string => {
      if (value === null || value === undefined) return ''
      const str = String(value).trim()
      // Quote if contains comma, newline, or double quote
      if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
        // Escape existing quotes by doubling them
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    }
    
    // Calculate totals for summary
    const totalAmount = giftAidRows.length > 0 
      ? giftAidRows.reduce((sum, row) => {
          const amount = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount)) || 0
          return sum + amount
        }, 0)
      : 0
    
    // Calculate earliest donation date for Box 1
    const earliestDonationDate = giftAidRows.length > 0
      ? giftAidRows.reduce((earliest, row) => {
          const rowDate = parseDate(row.donationDate)
          return rowDate < earliest ? rowDate : earliest
        }, parseDate(giftAidRows[0].donationDate))
      : new Date()
    
    // Generate CSV content matching the Excel template structure exactly
    const csvRows: string[] = []
    
    // Rows 1-4: Empty rows (for branding/title area at top)
    csvRows.push('') // Row 1
    csvRows.push('') // Row 2
    csvRows.push('') // Row 3
    csvRows.push('') // Row 4
    
    // Row 5: "Donations schedule table" in column F (index 5)
    csvRows.push(',,,,,"Donations schedule table"')
    
    // Row 6: Header row (matching Excel template exactly)
    // Columns: A (empty), B (Item), C (Title), D (First name), E (Last name), F (House name or number), G (Postcode), H (Aggregated donations), I (Sponsored event), J (Donation date), K (Amount)
    csvRows.push(',Item,Title,First name,Last name,House name or number,Postcode,Aggregated donations,Sponsored event,Donation date,Amount')
    
    // Rows 7-10: Empty rows (example data area in template - we skip these for actual data)
    csvRows.push('') // Row 7
    csvRows.push('') // Row 8
    csvRows.push('') // Row 9
    csvRows.push('') // Row 10
    
    // Row 11: "Enter details from here" in column B (index 1)
    csvRows.push(',"Enter details from here"')
    
    // Row 12: Empty
    csvRows.push('')
    
    // Row 13: "Box 1" in column B, "Earliest donation date in the period of claim. (DD/MM/YY)" in column C, then the date value in column D
    csvRows.push(',"Box 1","Earliest donation date in the period of claim. (DD/MM/YY)",' + escapeCsvValue(formatDate(earliestDonationDate)))
    
    // Row 14: Empty
    csvRows.push('')
    
    // Row 15: Empty
    csvRows.push('')
    
    // Row 16: "Box 2" in column B, "Previously over-claimed amount. Leave blank if none" in column C
    csvRows.push(',"Box 2","Previously over-claimed amount. Leave blank if none"')
    
    // Row 17: Empty
    csvRows.push('')
    
    // Row 18: "Don't use a £ sign" in column C (index 2)
    csvRows.push(',,,"Don\'t use a £ sign"')
    
    // Row 19: Additional text in column F (index 5)
    csvRows.push(',,,,,"For aggregated donations, this date may be earlier than any date entered in the donation date column of the donations schedule table below."')
    
    // Row 20: Additional text in column F (index 5)
    csvRows.push(',,,,,"Make sure you show the tax not the donation. This amount will be deducted from your claim."')
    
    // Row 21: "The total below is automatically calculated..." in column F (index 5)
    csvRows.push(',,,,,"The total below is automatically calculated from the amounts you enter in the schedule."')
    
    // Row 22: Empty (spacing - data rows will start here)
    csvRows.push('')
    
    // Data rows - one per aggregated donor
    for (const rowData of giftAidRows) {
      const amount = typeof rowData.amount === 'number' ? rowData.amount : parseFloat(String(rowData.amount)) || 0
      const csvRow = [
        '', // Column A (empty/margin)
        escapeCsvValue(rowData.item || ''),
        escapeCsvValue(rowData.title || ''),
        escapeCsvValue(rowData.firstName || ''),
        escapeCsvValue(rowData.lastName || ''),
        escapeCsvValue(rowData.houseNameOrNumber || ''),
        escapeCsvValue(rowData.postcode || ''),
        escapeCsvValue(rowData.aggregatedDonations || ''), // Empty string
        escapeCsvValue(rowData.sponsoredEvent || ''), // Empty string
        escapeCsvValue(rowData.donationDate || ''),
        escapeCsvValue(amount.toFixed(2)) // Amount as numeric string, no £ sign
      ].join(',')
      
      csvRows.push(csvRow)
    }
    
    // Join all rows with newlines (no blank rows between entries)
    const csvContent = csvRows.join('\n')
    
    // Generate filename with date range
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthName = monthNames[end.getMonth()]
    const year = end.getFullYear()
    const filename = `Gift Aid ${monthName} ${year}.csv`
    
    // Calculate total count
    const totalCount = giftAidRows.length
    
    // Save submission record to database
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
    
    // Return CSV file
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })
  } catch (error: any) {
    logger.error('Generate gift aid file error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      { 
        error: 'Failed to generate gift aid file',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

