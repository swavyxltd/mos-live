export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { requireRole, requireOrg } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { jsPDF } from 'jspdf'
import { format } from 'date-fns'

async function handleGET(request: NextRequest) {
  try {
    const session = await requireRole(['PARENT'])(request)
    if (session instanceof NextResponse) return session

    const orgId = await requireOrg(request)
    if (orgId instanceof NextResponse) return orgId

    // Get parent's information and org details
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        name: true,
        email: true,
        address: true,
        postcode: true,
        title: true,
        giftAidStatus: true,
        giftAidDeclaredAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.giftAidStatus !== 'YES') {
      return NextResponse.json(
        { error: 'Gift Aid is not active for this account' },
        { status: 400 }
      )
    }

    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        address: true,
        phone: true,
        email: true
      }
    })

    if (!org) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Generate PDF
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 20
    let y = margin

    // Header
    doc.setFontSize(20)
    doc.setTextColor(17, 24, 39) // gray-900
    doc.setFont('helvetica', 'bold')
    doc.text('Gift Aid Declaration', margin, y)
    y += 15

    doc.setFontSize(10)
    doc.setTextColor(107, 114, 128) // gray-500
    doc.setFont('helvetica', 'normal')
    doc.text(org.name, margin, y)
    y += 5
    if (org.address) {
      doc.text(org.address, margin, y)
      y += 5
    }
    if (org.phone) {
      doc.text(`Phone: ${org.phone}`, margin, y)
      y += 5
    }
    if (org.email) {
      doc.text(`Email: ${org.email}`, margin, y)
      y += 5
    }

    y += 10

    // Declaration Section
    doc.setFontSize(12)
    doc.setTextColor(17, 24, 39)
    doc.setFont('helvetica', 'bold')
    doc.text('Declaration', margin, y)
    y += 10

    doc.setFontSize(10)
    doc.setTextColor(55, 65, 81) // gray-700
    doc.setFont('helvetica', 'normal')
    
    const declarationText = [
      'I want the madrasah to reclaim tax on all qualifying payments I have made since',
      '6 April 2024 and all future payments I make from the date of this declaration',
      'until I notify you otherwise.',
      '',
      'I understand that:',
      '• I must pay an amount of Income Tax and/or Capital Gains Tax for each tax year',
      '  (6 April to 5 April) that is at least equal to the amount of Gift Aid that all',
      '  charities and Community Amateur Sports Clubs (CASCs) will reclaim on my',
      '  donations for that tax year.',
      '• I understand the madrasah will reclaim 25% of the value of my payments from',
      '  HMRC.',
      '• If I pay less Income Tax and/or Capital Gains Tax than the amount of Gift Aid',
      '  claimed on all my donations in that tax year, it is my responsibility to pay any',
      '  difference.',
      '• Please notify the madrasah if you want to cancel this declaration, change your',
      '  name or home address, or if you no longer pay sufficient tax on your income',
      '  and/or capital gains.',
      '',
      'I confirm that I am a UK taxpayer and that the information I have provided is',
      'correct.'
    ]

    declarationText.forEach((line) => {
      if (y > 250) {
        doc.addPage()
        y = margin
      }
      doc.text(line, margin, y)
      y += 5
    })

    y += 10

    // Donor Information
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(17, 24, 39)
    doc.text('Donor Information', margin, y)
    y += 10

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(55, 65, 81)

    const nameParts = (user.name || '').trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    doc.setFont('helvetica', 'bold')
    doc.text('Title:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(user.title || '', margin + 25, y)
    y += 8

    doc.setFont('helvetica', 'bold')
    doc.text('First Name:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(firstName, margin + 30, y)
    y += 8

    doc.setFont('helvetica', 'bold')
    doc.text('Last Name:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(lastName, margin + 30, y)
    y += 8

    doc.setFont('helvetica', 'bold')
    doc.text('Address:', margin, y)
    doc.setFont('helvetica', 'normal')
    if (user.address) {
      const addressLines = doc.splitTextToSize(user.address, pageWidth - margin - 30)
      doc.text(addressLines, margin + 25, y)
      y += addressLines.length * 5
    } else {
      y += 5
    }

    doc.setFont('helvetica', 'bold')
    doc.text('Postcode:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text((user.postcode || '').toUpperCase(), margin + 30, y)
    y += 8

    doc.setFont('helvetica', 'bold')
    doc.text('Email:', margin, y)
    doc.setFont('helvetica', 'normal')
    doc.text(user.email || '', margin + 25, y)
    y += 8

    if (user.giftAidDeclaredAt) {
      doc.setFont('helvetica', 'bold')
      doc.text('Declaration Date:', margin, y)
      doc.setFont('helvetica', 'normal')
      doc.text(format(new Date(user.giftAidDeclaredAt), 'dd MMMM yyyy'), margin + 40, y)
    }

    // Signature line
    y += 20
    if (y > 250) {
      doc.addPage()
      y = margin
    }
    doc.setFont('helvetica', 'normal')
    doc.text('Signature: _________________________', margin, y)
    y += 8
    doc.text('Date: _________________________', margin, y)

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 15
    doc.setFontSize(8)
    doc.setTextColor(156, 163, 175) // gray-400
    doc.text('Generated by Madrasah OS', margin, footerY)
    doc.text(`Declaration ID: ${session.user.id.slice(-8)}`, pageWidth - margin - 50, footerY, { align: 'right' })

    // Return PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'))
    
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="gift-aid-declaration-${format(new Date(), 'yyyy-MM-dd')}.pdf"`,
      },
    })
  } catch (error: any) {
    logger.error('Generate parent gift aid declaration error', error)
    const isDevelopment = process.env.NODE_ENV === 'development'
    return NextResponse.json(
      {
        error: 'Failed to generate declaration',
        ...(isDevelopment && { details: error?.message })
      },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handleGET)

