export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import JSZip from 'jszip'
import { readFileSync } from 'fs'
import { join } from 'path'

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
    
    // Calculate earliest donation date from the data
    const earliestDate = giftAidRows.length > 0
      ? giftAidRows.reduce((earliest, row) => {
          const rowDate = parseDate(row.donationDate)
          return rowDate < earliest ? rowDate : earliest
        }, parseDate(giftAidRows[0].donationDate))
      : new Date()
    
    // Calculate total donations
    const totalDonations = giftAidRows.reduce((sum, row) => {
      const amount = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount)) || 0
      return sum + amount
    }, 0)
    
    // Load the HMRC template ODS file
    const templatePath = join(process.cwd(), 'public', 'gift_aid_schedule__libre_.ods')
    const templateBuffer = readFileSync(templatePath)
    const zip = await JSZip.loadAsync(templateBuffer)
    
    // Read and parse content.xml
    const contentXml = await zip.file('content.xml')?.async('string')
    if (!contentXml) {
      throw new Error('Template file is missing content.xml')
    }
    
    // Helper to escape XML
    const escapeXml = (str: string): string => {
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;')
    }
    
    // Helper to unescape XML (for reading)
    const unescapeXml = (str: string): string => {
      return str
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
    }
    
    // Use a more reliable string-based approach with proper cell identification
    let modifiedContent = contentXml
    
    // Helper to find and update a specific cell in a row by column index (0-based)
    function updateCellInRowByIndex(rowXml: string, columnIndex: number, newText: string, valueType?: string, officeValue?: string): string {
      // Find all cells in the row, accounting for colspan
      const cellMatches: Array<{ fullMatch: string; startPos: number; endPos: number; colspan: number }> = []
      const cellRegex = /<table:table-cell([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-cell>)/g
      let match
      let currentColumn = 0
      
      while ((match = cellRegex.exec(rowXml)) !== null && currentColumn <= columnIndex + 10) {
        const fullMatch = match[0]
        const attrs = match[1]
        const content = match[2] || ''
        
        // Check for colspan
        const colspanMatch = attrs.match(/table:number-columns-spanned="(\d+)"/)
        const colspan = colspanMatch ? parseInt(colspanMatch[1], 10) : 1
        
        // Check if this cell or any column it spans matches our target
        if (currentColumn <= columnIndex && columnIndex < currentColumn + colspan) {
          // This is the cell we need to update
          let updatedCell = fullMatch
          
          // Remove existing text:p content
          updatedCell = updatedCell.replace(/<text:p>[\s\S]*?<\/text:p>/g, '')
          
          // Build new cell with updated attributes and content
          let newAttrs = attrs
          
          // Update or add value-type
          if (valueType) {
            if (newAttrs.includes('office:value-type=')) {
              newAttrs = newAttrs.replace(/office:value-type="[^"]*"/, `office:value-type="${valueType}"`)
            } else {
              newAttrs += ` office:value-type="${valueType}"`
            }
          }
          
          // Update or add office:value for numbers
          if (officeValue !== undefined && valueType === 'float') {
            if (newAttrs.includes('office:value=')) {
              newAttrs = newAttrs.replace(/office:value="[^"]*"/, `office:value="${officeValue}"`)
            } else {
              newAttrs += ` office:value="${officeValue}"`
            }
          }
          
          // Build the new cell
          if (fullMatch.includes('/>')) {
            // Self-closing cell - convert to regular cell
            updatedCell = `<table:table-cell${newAttrs}><text:p>${escapeXml(newText)}</text:p></table:table-cell>`
          } else {
            // Regular cell - replace opening tag and add text
            updatedCell = `<table:table-cell${newAttrs}><text:p>${escapeXml(newText)}</text:p>${content}</table:table-cell>`
          }
          
          // Replace in row
          return rowXml.substring(0, match.index!) + updatedCell + rowXml.substring(match.index! + fullMatch.length)
        }
        
        currentColumn += colspan
      }
      
      return rowXml // Cell not found, return original
    }
    
    // Find all table rows
    const rowMatches = [...modifiedContent.matchAll(/<table:table-row([^>]*)>([\s\S]*?)<\/table:table-row>/g)]
    
    // Find header row (contains "Item")
    let headerRowIndex = -1
    for (let i = 0; i < rowMatches.length; i++) {
      const match = rowMatches[i]
      if (!match || !match[2]) continue
      const rowContent = match[2]
      const cellMatch = rowContent.match(/<table:table-cell/g)
      if (rowContent.includes('Item') && cellMatch && cellMatch.length >= 10) {
        headerRowIndex = i
        break
      }
    }
    
    if (headerRowIndex === -1) {
      throw new Error('Could not find header row in template')
    }
    
    // Find Box 1 row (contains "Earliest donation date")
    for (let i = 0; i < rowMatches.length; i++) {
      if (rowMatches[i][2].includes('Earliest donation date')) {
        const rowContent = rowMatches[i][2]
        const updatedRow = updateCellInRowByIndex(rowContent, 3, formatDate(earliestDate), 'string')
        const fullRow = rowMatches[i][0]
        const newFullRow = fullRow.replace(rowContent, updatedRow)
        modifiedContent = modifiedContent.replace(fullRow, newFullRow)
        break
      }
    }
    
    // Find Total donations row
    for (let i = 0; i < rowMatches.length; i++) {
      const rowContent = rowMatches[i][2]
      if (rowContent.includes('Total donations')) {
        // Find cell with office:value-type="float"
        const floatCellRegex = /<table:table-cell([^>]*office:value-type="float"[^>]*)(?:\/>|>([\s\S]*?)<\/table:table-cell>)/g
        const floatMatch = floatCellRegex.exec(rowContent)
        if (floatMatch) {
          const totalStr = totalDonations.toFixed(2)
          let updatedCell = floatMatch[0]
          updatedCell = updatedCell.replace(/<text:p>[\s\S]*?<\/text:p>/g, '')
          updatedCell = updatedCell.replace(/office:value="[^"]*"/, `office:value="${totalStr}"`)
          
          if (updatedCell.includes('/>')) {
            updatedCell = updatedCell.replace('/>', `><text:p>${escapeXml(totalStr)}</text:p></table:table-cell>`)
          } else {
            updatedCell = updatedCell.replace(/(<table:table-cell[^>]*>)/, `$1<text:p>${escapeXml(totalStr)}</text:p>`)
          }
          
          const updatedRow = rowContent.replace(floatMatch[0], updatedCell)
          const fullRow = rowMatches[i][0]
          const newFullRow = fullRow.replace(rowContent, updatedRow)
          modifiedContent = modifiedContent.replace(fullRow, newFullRow)
        }
        break
      }
    }
    
    // Re-find rows after updates
    const updatedRowMatches = [...modifiedContent.matchAll(/<table:table-row([^>]*)>([\s\S]*?)<\/table:table-row>/g)]
    
    // Find data rows (rows after header with 10+ cells, not form rows)
    const dataRowIndices: number[] = []
    for (let i = headerRowIndex + 1; i < updatedRowMatches.length; i++) {
      const rowContent = updatedRowMatches[i][2]
      
      // Skip form rows
      if (rowContent.includes('Box 1') || rowContent.includes('Box 2') || 
          rowContent.includes('Total donations') || rowContent.includes('Donations schedule table') ||
          rowContent.includes('Earliest donation date') || rowContent.includes('Previously over-claimed') ||
          rowContent.includes('Enter details from here')) {
        continue
      }
      
      // Count cells (including empty ones)
      // Need at least 11 cells (A through K)
      const cellCount = (rowContent.match(/<table:table-cell/g) || []).length
      if (cellCount >= 11) {
        dataRowIndices.push(i)
      }
    }
    
    // Fill data rows - process in reverse to avoid position shifts
    const rowsToFill = Math.min(giftAidRows.length, dataRowIndices.length)
    
    for (let i = rowsToFill - 1; i >= 0; i--) {
      const rowIndex = dataRowIndices[i]
      const rowData = giftAidRows[i]
      const fullRow = updatedRowMatches[rowIndex][0]
      const rowContent = updatedRowMatches[rowIndex][2]
      
      let updatedRow = rowContent
      
      // Update each column according to HMRC template:
      // Column A (index 0): Item
      // Column B (index 1): (empty/not used)
      // Column C (index 2): Title
      // Column D (index 3): First name
      // Column E (index 4): Last name
      // Column F (index 5): House name or number
      // Column G (index 6): Postcode
      // Column H (index 7): Aggregated donations
      // Column I (index 8): Sponsored event
      // Column J (index 9): Donation date
      // Column K (index 10): Amount
      const amount = typeof rowData.amount === 'number' ? rowData.amount : parseFloat(String(rowData.amount)) || 0
      
      updatedRow = updateCellInRowByIndex(updatedRow, 0, String(i + 1), 'float', String(i + 1)) // Item (A)
      // Column B is skipped (index 1)
      updatedRow = updateCellInRowByIndex(updatedRow, 2, rowData.title || '', 'string') // Title (C)
      updatedRow = updateCellInRowByIndex(updatedRow, 3, rowData.firstName || '', 'string') // First name (D)
      updatedRow = updateCellInRowByIndex(updatedRow, 4, rowData.lastName || '', 'string') // Last name (E)
      updatedRow = updateCellInRowByIndex(updatedRow, 5, rowData.houseNameOrNumber || '', 'string') // House name or number (F)
      updatedRow = updateCellInRowByIndex(updatedRow, 6, rowData.postcode || '', 'string') // Postcode (G)
      updatedRow = updateCellInRowByIndex(updatedRow, 7, rowData.aggregatedDonations || '', 'string') // Aggregated donations (H)
      updatedRow = updateCellInRowByIndex(updatedRow, 8, rowData.sponsoredEvent || '', 'string') // Sponsored event (I)
      updatedRow = updateCellInRowByIndex(updatedRow, 9, rowData.donationDate, 'string') // Donation date (J)
      updatedRow = updateCellInRowByIndex(updatedRow, 10, amount.toFixed(2), 'float', amount.toFixed(2)) // Amount (K)
      
      // Replace the row
      const newFullRow = fullRow.replace(rowContent, updatedRow)
      modifiedContent = modifiedContent.replace(fullRow, newFullRow)
    }
    
    
    // Update the content.xml in the zip
    zip.file('content.xml', modifiedContent)
    
    // Generate the ODS file
    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    
    // Generate filename with date range
    // HMRC rule: Save as .ods file (e.g., "Gift Aid Jan 2014.ods")
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
    const monthName = monthNames[end.getMonth()]
    const year = end.getFullYear()
    const filename = `Gift Aid ${monthName} ${year}.ods`
    
    // Calculate totals
    const totalAmount = giftAidRows.length > 0 
      ? giftAidRows.reduce((sum, row) => {
          const amount = typeof row.amount === 'number' ? row.amount : parseFloat(String(row.amount)) || 0
          return sum + amount
        }, 0)
      : 0
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
    
    // Return ODS file
    // HMRC Rule: File format must be .ods (OpenDocument Spreadsheet)
    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/vnd.oasis.opendocument.spreadsheet',
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

