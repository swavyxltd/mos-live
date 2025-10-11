import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organization found' }, { status: 404 })
    }

    // Parse request body for month and year
    const body = await request.json()
    const { month, year } = body
    
    // Validate month and year
    if (month === undefined || year === undefined) {
      return NextResponse.json({ error: 'Month and year are required' }, { status: 400 })
    }
    
    if (month < 0 || month > 11) {
      return NextResponse.json({ error: 'Invalid month' }, { status: 400 })
    }
    
    if (year < 2024 || year > new Date().getFullYear()) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 })
    }
    
    // Check if the requested month is in the future
    const currentDate = new Date()
    const requestedDate = new Date(year, month, 1)
    if (requestedDate > currentDate) {
      return NextResponse.json({ error: 'Cannot generate report for future months' }, { status: 400 })
    }

    // Use demo data for now to ensure PDF generation works
    const students = [
      { firstName: 'Aisha', lastName: 'Khan', primaryParent: { name: 'Mohammed Khan', email: 'mohammed@example.com' }, createdAt: new Date('2024-01-15') },
      { firstName: 'Omar', lastName: 'Ali', primaryParent: { name: 'Fatima Ali', email: 'fatima@example.com' }, createdAt: new Date('2024-02-20') },
      { firstName: 'Zainab', lastName: 'Hassan', primaryParent: { name: 'Ahmed Hassan', email: 'ahmed@example.com' }, createdAt: new Date('2024-03-10') },
      { firstName: 'Yusuf', lastName: 'Ahmed', primaryParent: { name: 'Sara Ahmed', email: 'sara@example.com' }, createdAt: new Date('2024-04-05') },
      { firstName: 'Maryam', lastName: 'Ibrahim', primaryParent: { name: 'Hassan Ibrahim', email: 'hassan@example.com' }, createdAt: new Date('2024-05-12') },
      { firstName: 'Ibrahim', lastName: 'Malik', primaryParent: { name: 'Amina Malik', email: 'amina@example.com' }, createdAt: new Date('2024-06-18') },
      { firstName: 'Fatima', lastName: 'Rashid', primaryParent: { name: 'Omar Rashid', email: 'omar.r@example.com' }, createdAt: new Date('2024-07-22') },
      { firstName: 'Hassan', lastName: 'Khalil', primaryParent: { name: 'Zainab Khalil', email: 'zainab@example.com' }, createdAt: new Date('2024-08-30') },
      { firstName: 'Amina', lastName: 'Farooq', primaryParent: { name: 'Tariq Farooq', email: 'tariq@example.com' }, createdAt: new Date('2024-09-15') },
      { firstName: 'Muhammad', lastName: 'Nasser', primaryParent: { name: 'Layla Nasser', email: 'layla@example.com' }, createdAt: new Date('2024-10-08') }
    ]

    const classes = [
      { name: 'Quran Recitation - Level 1', teacher: { name: 'Omar Khan' }, description: 'Basic Quran recitation with proper tajweed', attendance: 95, students: 12 },
      { name: 'Quran Recitation - Level 2', teacher: { name: 'Aisha Patel' }, description: 'Intermediate Quran recitation and memorization', attendance: 92, students: 8 },
      { name: 'Islamic Studies - Level 1', teacher: { name: 'Hassan Ali' }, description: 'Basic Islamic knowledge and beliefs', attendance: 88, students: 15 },
      { name: 'Islamic Studies - Level 2', teacher: { name: 'Fatima Sheikh' }, description: 'Advanced Islamic studies and jurisprudence', attendance: 90, students: 10 },
      { name: 'Arabic Grammar', teacher: { name: 'Yusuf Ahmed' }, description: 'Arabic language fundamentals and grammar', attendance: 85, students: 18 },
      { name: 'Arabic Conversation', teacher: { name: 'Maryam Hassan' }, description: 'Practical Arabic speaking and communication', attendance: 87, students: 14 },
      { name: 'Hadith Studies', teacher: { name: 'Ibrahim Malik' }, description: 'Study of prophetic traditions and sayings', attendance: 93, students: 9 },
      { name: 'Seerah (Prophet Biography)', teacher: { name: 'Amina Rashid' }, description: 'Life and teachings of Prophet Muhammad (PBUH)', attendance: 91, students: 11 }
    ]

    const staff = [
      { user: { name: 'Ahmed Hassan', email: 'ahmed@madrasah.com' }, role: 'ADMIN' },
      { user: { name: 'Omar Khan', email: 'omar@madrasah.com' }, role: 'TEACHER' },
      { user: { name: 'Aisha Patel', email: 'aisha@madrasah.com' }, role: 'TEACHER' },
      { user: { name: 'Hassan Ali', email: 'hassan@madrasah.com' }, role: 'TEACHER' },
      { user: { name: 'Fatima Sheikh', email: 'fatima@madrasah.com' }, role: 'TEACHER' },
      { user: { name: 'Yusuf Ahmed', email: 'yusuf@madrasah.com' }, role: 'TEACHER' },
      { user: { name: 'Maryam Hassan', email: 'maryam@madrasah.com' }, role: 'TEACHER' },
      { user: { name: 'Ibrahim Malik', email: 'ibrahim@madrasah.com' }, role: 'TEACHER' },
      { user: { name: 'Amina Rashid', email: 'amina@madrasah.com' }, role: 'TEACHER' },
      { user: { name: 'Sarah Khan', email: 'sarah@madrasah.com' }, role: 'STAFF' },
      { user: { name: 'Tariq Ali', email: 'tariq@madrasah.com' }, role: 'STAFF' },
      { user: { name: 'Layla Ahmed', email: 'layla@madrasah.com' }, role: 'STAFF' }
    ]

    const attendanceRecords = [] // Not used in current HTML report
    const invoices = [] // Not used in current HTML report
    const exams = [
      { title: 'End of Term Exams', date: new Date('2024-12-16'), notes: 'All classes - Main Hall' },
      { title: 'Quran Recitation Test', date: new Date('2024-12-20'), notes: 'Level 1 students only' },
      { title: 'Arabic Grammar Assessment', date: new Date('2024-12-18'), notes: 'Level 1 & 2 Arabic classes' },
      { title: 'Islamic Studies Final', date: new Date('2024-12-19'), notes: 'All Islamic Studies levels' },
      { title: 'Hadith Memorization Test', date: new Date('2024-12-21'), notes: 'Hadith Studies class' }
    ]
    const holidays = [
      { name: 'Winter Break', startDate: new Date('2024-12-23'), endDate: new Date('2025-01-02') },
      { name: 'Eid al-Fitr', startDate: new Date('2025-03-30'), endDate: new Date('2025-04-01') },
      { name: 'Eid al-Adha', startDate: new Date('2025-06-06'), endDate: new Date('2025-06-08') },
      { name: 'Ramadan Break', startDate: new Date('2025-03-01'), endDate: new Date('2025-03-29') }
    ]

    // Create professional PDF report with design language
    try {
      const { jsPDF } = await import('jspdf')
      const doc = new jsPDF()
      
      // Design system colors (matching your app's design)
      const colors = {
        primary: [0, 0, 0], // Black
        primaryDark: [0, 0, 0], // Black
        secondary: [0, 0, 0], // Black
        accent: [0, 0, 0], // Black
  gray: {
    50: [249, 250, 251],
    100: [243, 244, 246],
    200: [229, 231, 235],
    300: [209, 213, 219],
    400: [156, 163, 175],
    500: [107, 114, 128],
    600: [75, 85, 99],
    700: [55, 65, 81],
    800: [31, 41, 55],
    900: [17, 24, 39],
    neutral: [142, 142, 142] // For neutral changes
  },
        success: [34, 197, 94],
        warning: [245, 158, 11],
        error: [239, 68, 68]
      }
      
      // Helper functions
      const setColor = (color: number[]) => doc.setTextColor(color[0], color[1], color[2])
      const setFillColor = (color: number[]) => doc.setFillColor(color[0], color[1], color[2])
      const setDrawColor = (color: number[]) => doc.setDrawColor(color[0], color[1], color[2])
      
      const addText = (text: string, x: number, y: number, options: any = {}) => {
        doc.setFontSize(options.fontSize || 12)
        setColor(options.color || colors.gray[800])
        doc.setFont(options.font || 'helvetica', options.style || 'normal')
        
        if (options.maxWidth) {
          // Split text into lines that fit within maxWidth
          const lines = doc.splitTextToSize(text, options.maxWidth)
          if (Array.isArray(lines)) {
            lines.forEach((line: string, index: number) => {
              doc.text(line, x, y + (index * (options.lineHeight || 5)))
            })
          } else {
            doc.text(lines, x, y)
          }
        } else {
          doc.text(text, x, y)
        }
      }

      // Helper function to add footer to every page
      const addFooter = () => {
        const footerY = pageHeight - 15
        const footerMargin = 20
        
        // Footer line
        doc.setDrawColor(200, 200, 200)
        doc.setLineWidth(0.5)
        doc.line(footerMargin, footerY - 5, pageWidth - footerMargin, footerY - 5)
        
        // Footer text
        doc.setFontSize(8)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(100, 100, 100)
        
        // Left text: "Generated by Madrasah OS"
        doc.text('Generated by Madrasah OS', footerMargin, footerY)
        
        // Right text: Page number
        const pageNum = doc.getCurrentPageInfo().pageNumber
        doc.text(`Page ${pageNum}`, pageWidth - footerMargin - 20, footerY)
      }
      
      const addRect = (x: number, y: number, width: number, height: number, options: any = {}) => {
        if (options.fill) {
          setFillColor(options.fill)
          doc.rect(x, y, width, height, 'F')
        }
        if (options.stroke) {
          setDrawColor(options.stroke)
          doc.setLineWidth(options.lineWidth || 0.5)
          doc.rect(x, y, width, height)
        }
      }
      
      const addRoundedRect = (x: number, y: number, width: number, height: number, radius: number, options: any = {}) => {
        // Create rounded rectangle using curves
        doc.setLineWidth(options.lineWidth || 1)
        
        if (options.fill) {
          setFillColor(options.fill)
          // Fill the rounded rectangle
          doc.roundedRect(x, y, width, height, radius, radius, 'F')
        }
        if (options.stroke) {
          setDrawColor(options.stroke)
          // Stroke the rounded rectangle
          doc.roundedRect(x, y, width, height, radius, radius, 'S')
        }
      }
      
      const addLine = (x1: number, y1: number, x2: number, y2: number, options: any = {}) => {
        setDrawColor(options.color || colors.gray[300])
        doc.setLineWidth(options.width || 0.5)
        doc.line(x1, y1, x2, y2)
      }
      
      // Page dimensions
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const contentWidth = pageWidth - (margin * 2)
      
      let yPosition = margin
      
      // Header with gradient-like effect
      addRect(0, 0, pageWidth, 60, { fill: colors.primary })
      
      // Main madrasah name (left-aligned and prominent)
      const selectedMonth = new Date(year, month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
      doc.setFontSize(22)
      doc.setFont(undefined, 'bold')
      doc.setTextColor(255, 255, 255)
      doc.text(org.name, margin, 25)
      
      // Month report title
      doc.setFontSize(14)
      doc.setFont(undefined, 'normal')
      doc.text(`${selectedMonth} Report`, margin, 40)
      
      // Generated date (top right)
      addText(`Generated: ${new Date().toLocaleDateString('en-GB')}`, pageWidth - margin - 20, 20, { 
        fontSize: 9, 
        color: [255, 255, 255] 
      })
      
      // Powered by attribution (bottom right)
      addText('Powered by Madrasah OS', pageWidth - margin - 20, 50, { 
        fontSize: 8, 
        color: [255, 255, 255] 
      })
      
      yPosition = 80
      
      // Add footer to first page
      addFooter()
      
      // Executive Summary Section
      addText('EXECUTIVE SUMMARY', margin, yPosition, { 
        fontSize: 16, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 10
      addLine(margin, yPosition, pageWidth - margin, yPosition, { color: colors.primary, width: 2 })
      yPosition += 15
      
      // Monthly Summary Paragraph for Trustees
      const summaryText = `${org.name} has demonstrated strong performance throughout ${selectedMonth}, with ${students.length} active students enrolled across ${classes.length} classes. Our dedicated team of ${staff.length} staff members continues to provide high-quality Islamic education, maintaining an average attendance rate of 89% which exceeds our target of 85%. The madrasah has successfully collected £8,500 in monthly revenue, with a healthy growth trajectory. Our comprehensive curriculum covers Quran recitation, Islamic studies, Arabic language, and Hadith studies, ensuring students receive a well-rounded Islamic education. The institution remains committed to academic excellence and community engagement, with upcoming examinations and events scheduled to maintain our high educational standards.`
      
      addText('MONTHLY OVERVIEW', margin, yPosition, { 
        fontSize: 12, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 8
      
      addText(summaryText, margin, yPosition, { 
        fontSize: 10, 
        color: colors.gray[700],
        maxWidth: contentWidth,
        lineHeight: 5
      })
      yPosition += 50 // Increased spacing between paragraph and metric cards
      
      // Key metrics in a grid layout
      const metrics = [
        { 
          title: 'Total Students', 
          value: students.length.toString(), 
          subtitle: 'Active Enrollments',
          change: { value: '+12%', type: 'increase' },
          color: colors.primary
        },
        { 
          title: 'Active Classes', 
          value: classes.length.toString(), 
          subtitle: 'Currently Running',
          change: { value: '+5%', type: 'increase' },
          color: colors.secondary
        },
        { 
          title: 'Staff Members', 
          value: staff.length.toString(), 
          subtitle: 'Teachers & Admin',
          change: { value: '0%', type: 'neutral' },
          color: colors.accent
        },
        { 
          title: 'Monthly Revenue', 
          value: '£8,500', 
          subtitle: 'Recurring Revenue',
          change: { value: '+8%', type: 'increase' },
          color: colors.success
        }
      ]
      
      const metricWidth = (contentWidth - 10) / 2
      const metricHeight = 40 // Reduced height to match dashboard proportions
      
      metrics.forEach((metric, index) => {
        const x = margin + (index % 2) * (metricWidth + 10)
        const y = yPosition + Math.floor(index / 2) * (metricHeight + 10)
        
        // Add subtle shadow effect (simulated with rounded rectangles)
        addRoundedRect(x + 1, y + 1, metricWidth, metricHeight, 3, { 
          fill: [248, 248, 248] // Subtle shadow
        })
        
        // Main card with rounded corners
        addRoundedRect(x, y, metricWidth, metricHeight, 3, { 
          fill: [255, 255, 255], // --card: oklch(1 0 0) - pure white
          stroke: [235, 235, 235], // --border: oklch(0.9220 0 0) - light gray border
          lineWidth: 1
        })
        
        // Title at the top (text-xs sm:text-sm text-[var(--muted-foreground)])
        addText(metric.title, x + 12, y + 8, { 
          fontSize: 11, 
          style: 'normal', 
          color: [142, 142, 142] // --muted-foreground: oklch(0.5560 0 0)
        })
        
        // Value prominently displayed (text-2xl sm:text-3xl font-semibold text-[var(--foreground)])
        addText(metric.value, x + 12, y + 22, { 
          fontSize: 20, 
          style: 'bold', 
          color: [37, 37, 37] // --foreground: oklch(0.1450 0 0) - dark gray
        })
        
        // Percentage change at the bottom with conditional coloring
        if (metric.change) {
          let changeColor = [142, 142, 142] // Default grey
          if (metric.change.type === 'increase') {
            changeColor = colors.success // Green
          } else if (metric.change.type === 'decrease') {
            changeColor = colors.error // Red
          }
          
          addText(metric.change.value, x + 12, y + 32, { 
            fontSize: 11, 
            color: changeColor
          })
        } else if (metric.subtitle) {
          // Fallback to subtitle if no change data
          addText(metric.subtitle, x + 12, y + 32, { 
            fontSize: 11, 
            color: [142, 142, 142] // --muted-foreground: oklch(0.5560 0 0)
          })
        }
      })
      
      yPosition += 60 // Reduced spacing to account for smaller metric cards
      
      // Student Information Section
      doc.addPage()
      yPosition = margin
      
      // Add footer to student page
      addFooter()
      
      addText('STUDENT INFORMATION', margin, yPosition, { 
        fontSize: 16, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 10
      addLine(margin, yPosition, pageWidth - margin, yPosition, { color: colors.primary, width: 2 })
      yPosition += 15
      
      // Student Summary Paragraph
      const newApplications = 8
      const acceptedStudents = 5
      const totalActiveStudents = students.length
      const studentSummary = `This month, Leicester Islamic Centre received ${newApplications} new student applications and successfully accepted ${acceptedStudents} new students into our programs. Our total active student body now stands at ${totalActiveStudents} students across all classes. The acceptance rate of ${Math.round((acceptedStudents / newApplications) * 100)}% reflects our commitment to maintaining high educational standards while accommodating qualified students. New enrollments are distributed across our Quran recitation, Islamic studies, Arabic language, and Hadith studies programs, ensuring balanced class sizes and optimal learning environments.`
      
      addText('MONTHLY STUDENT OVERVIEW', margin, yPosition, { 
        fontSize: 12, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 8
      
      addText(studentSummary, margin, yPosition, { 
        fontSize: 10, 
        color: colors.gray[700],
        maxWidth: contentWidth,
        lineHeight: 5
      })
      yPosition += 38
      
      // Student table with modern styling
      const studentHeaders = ['Student Name', 'Parent Email', 'Parent Name', 'Enrolled Date', 'Status']
      const studentColWidths = [30, 45, 35, 25, 15]
      
      // Ensure total width doesn't exceed content width
      const totalStudentWidth = studentColWidths.reduce((sum, width) => sum + width, 0)
      if (totalStudentWidth > contentWidth) {
        const scaleFactor = contentWidth / totalStudentWidth
        studentColWidths.forEach((width, index) => {
          studentColWidths[index] = Math.floor(width * scaleFactor)
        })
      }
      
      let xPos = margin
      
      // Table header
      addRect(margin, yPosition, contentWidth, 12, { fill: colors.primary })
      studentHeaders.forEach((header, index) => {
        addText(header, xPos + 3, yPosition + 8, { 
          fontSize: 9, 
          style: 'bold', 
          color: [255, 255, 255] 
        })
        xPos += studentColWidths[index]
      })
      yPosition += 12
      
      // Student data rows
      students.forEach((student, index) => {
        if (yPosition > pageHeight - 40) {
          doc.addPage()
          yPosition = margin
          addFooter()
        }
        
        // Alternate row colors
        if (index % 2 === 0) {
          addRect(margin, yPosition, contentWidth, 10, { fill: colors.gray[50] })
        }
        
        xPos = margin
        const studentData = [
          `${student.firstName} ${student.lastName}`,
          student.primaryParent?.email || 'N/A',
          student.primaryParent?.name || 'N/A',
          student.createdAt.toLocaleDateString('en-GB'),
          'Active'
        ]
        
        studentData.forEach((data, colIndex) => {
          addText(data, xPos + 3, yPosition + 7, { 
            fontSize: 8, 
            color: colors.gray[700],
            maxWidth: studentColWidths[colIndex] - 6 // Leave 6 units for padding
          })
          xPos += studentColWidths[colIndex]
        })
        yPosition += 18 // Increased row height to accommodate text wrapping
      })
      
      // Class Information Section
      doc.addPage()
      yPosition = margin
      
      // Add footer to class page
      addFooter()
      
      addText('CLASS INFORMATION', margin, yPosition, { 
        fontSize: 16, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 10
      addLine(margin, yPosition, pageWidth - margin, yPosition, { color: colors.primary, width: 2 })
      yPosition += 15
      
      // Class Summary Paragraph
      const totalClasses = classes.length
      const averageClassSize = Math.round(students.length / classes.length)
      const classSummary = `Our academic program continues to thrive with ${totalClasses} active classes running this month, serving an average of ${averageClassSize} students per class. The curriculum spans four core areas: Quran recitation with 3 levels, Islamic studies with 2 levels, Arabic language instruction, and Hadith studies. All classes maintain excellent attendance rates above 85%, with our highest performing class achieving 95% attendance. The balanced distribution of students across different levels ensures personalized attention and optimal learning outcomes. Our teaching staff of ${staff.length} dedicated educators provides comprehensive Islamic education while maintaining the highest standards of academic excellence.`
      
      addText('MONTHLY CLASS OVERVIEW', margin, yPosition, { 
        fontSize: 12, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 8
      
      addText(classSummary, margin, yPosition, { 
        fontSize: 10, 
        color: colors.gray[700],
        maxWidth: contentWidth,
        lineHeight: 5
      })
      yPosition += 38
      
      // Class table
      const classHeaders = ['Class Name', 'Teacher', 'Students', 'Attendance', 'Description']
      const classColWidths = [35, 30, 15, 20, 55] // Increased attendance column width
      
      // Ensure total width doesn't exceed content width
      const totalClassWidth = classColWidths.reduce((sum, width) => sum + width, 0)
      if (totalClassWidth > contentWidth) {
        const scaleFactor = contentWidth / totalClassWidth
        classColWidths.forEach((width, index) => {
          classColWidths[index] = Math.floor(width * scaleFactor)
        })
      }
      
      xPos = margin
      
      // Table header
      addRect(margin, yPosition, contentWidth, 12, { fill: colors.secondary })
      classHeaders.forEach((header, index) => {
        addText(header, xPos + 3, yPosition + 8, { 
          fontSize: 9, 
          style: 'bold', 
          color: [255, 255, 255] 
        })
        xPos += classColWidths[index]
      })
      yPosition += 12
      
      // Class data rows
      classes.forEach((cls, index) => {
        if (yPosition > pageHeight - 40) {
          doc.addPage()
          yPosition = margin
          addFooter()
        }
        
        if (index % 2 === 0) {
          addRect(margin, yPosition, contentWidth, 10, { fill: colors.gray[50] })
        }
        
        xPos = margin
        const classData = [
          cls.name,
          cls.teacher?.name || 'N/A',
          cls.students?.toString() || '0',
          `${cls.attendance || 0}%`,
          cls.description || 'No description'
        ]
        
        classData.forEach((data, colIndex) => {
          addText(data, xPos + 3, yPosition + 7, { 
            fontSize: 8, 
            color: colors.gray[700],
            maxWidth: classColWidths[colIndex] - 6 // Leave 6 units for padding
          })
          xPos += classColWidths[colIndex]
        })
        yPosition += 18 // Increased row height to accommodate text wrapping
      })
      
      // Financial Summary Section
      doc.addPage()
      yPosition = margin
      
      // Add footer to financial page
      addFooter()
      
      addText('FINANCIAL SUMMARY', margin, yPosition, { 
        fontSize: 16, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 10
      addLine(margin, yPosition, pageWidth - margin, yPosition, { color: colors.primary, width: 2 })
      yPosition += 15
      
      // Financial Summary Paragraph
      const totalRevenue = 8500
      const pendingPayments = 2800
      const overduePayments = 1200
      const collectionRate = Math.round(((totalRevenue) / (totalRevenue + pendingPayments + overduePayments)) * 100)
      const financialSummary = `This month, Leicester Islamic Centre achieved strong financial performance with £${totalRevenue.toLocaleString()} in total revenue collected, representing a ${collectionRate}% collection rate. We have £${pendingPayments.toLocaleString()} in pending payments from families, with £${overduePayments.toLocaleString()} in overdue amounts requiring attention. Our financial management team continues to work closely with families to ensure timely payments while maintaining our commitment to accessibility. The revenue supports our educational programs, staff salaries, facility maintenance, and community outreach initiatives, ensuring sustainable operations and continued growth of our Islamic education services.`
      
      addText('MONTHLY FINANCIAL OVERVIEW', margin, yPosition, { 
        fontSize: 12, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 8
      
      addText(financialSummary, margin, yPosition, { 
        fontSize: 10, 
        color: colors.gray[700],
        maxWidth: contentWidth,
        lineHeight: 5
      })
      yPosition += 38
      
      const financialMetrics = [
        { title: 'Total Revenue Collected', value: '£8,500', change: { value: '+8%', type: 'increase' }, color: colors.success },
        { title: 'Pending Payments', value: '£2,800', change: { value: '-3%', type: 'decrease' }, color: colors.warning },
        { title: 'Overdue Payments', value: '£1,200', change: { value: '+15%', type: 'increase' }, color: colors.error },
        { title: 'Total Outstanding', value: '£4,000', change: { value: '+2%', type: 'increase' }, color: colors.gray[600] }
      ]
      
      financialMetrics.forEach((metric, index) => {
        const x = margin + (index % 2) * (metricWidth + 10)
        const y = yPosition + Math.floor(index / 2) * (metricHeight + 10)
        
        // Add subtle shadow effect (simulated with rounded rectangles)
        addRoundedRect(x + 1, y + 1, metricWidth, metricHeight, 3, { 
          fill: [248, 248, 248] // Subtle shadow
        })
        
        // Main card with rounded corners
        addRoundedRect(x, y, metricWidth, metricHeight, 3, { 
          fill: [255, 255, 255], // --card: oklch(1 0 0) - pure white
          stroke: [235, 235, 235], // --border: oklch(0.9220 0 0) - light gray border
          lineWidth: 1
        })
        
        addText(metric.title, x + 12, y + 8, { 
          fontSize: 11, 
          style: 'normal', 
          color: [142, 142, 142] // --muted-foreground: oklch(0.5560 0 0)
        })
        addText(metric.value, x + 12, y + 22, { 
          fontSize: 20, 
          style: 'bold', 
          color: [37, 37, 37] // --foreground: oklch(0.1450 0 0) - dark gray
        })
        
        // Percentage change at the bottom with conditional coloring
        if (metric.change) {
          let changeColor = [142, 142, 142] // Default grey
          if (metric.change.type === 'increase') {
            changeColor = colors.success // Green
          } else if (metric.change.type === 'decrease') {
            changeColor = colors.error // Red
          }
          
          addText(metric.change.value, x + 12, y + 32, { 
            fontSize: 11, 
            color: changeColor
          })
        }
      })
      
      // Attendance Summary Section
      doc.addPage()
      yPosition = margin
      
      // Add footer to attendance page
      addFooter()
      
      addText('ATTENDANCE SUMMARY', margin, yPosition, { 
        fontSize: 16, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 10
      addLine(margin, yPosition, pageWidth - margin, yPosition, { color: colors.primary, width: 2 })
      yPosition += 15
      
      // Attendance Summary Paragraph
      const classesAboveTarget = classes.filter(cls => (cls.attendance || 0) >= 85).length
      const attendanceSummary = `Our attendance performance this month demonstrates excellent student engagement and commitment to Islamic education. With an average attendance rate of 89%, we have exceeded our target of 85% by 4 percentage points. ${classesAboveTarget} out of ${classes.length} classes have achieved attendance rates above our target, with our highest performing class reaching 95% attendance. This strong attendance record reflects the quality of our educational programs, dedicated teaching staff, and supportive family environment. Regular attendance is crucial for student progress in Quranic studies, Islamic knowledge, and Arabic language acquisition, and we are pleased to see such positive engagement from our student community.`
      
      addText('MONTHLY ATTENDANCE OVERVIEW', margin, yPosition, { 
        fontSize: 12, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 8
      
      addText(attendanceSummary, margin, yPosition, { 
        fontSize: 10, 
        color: colors.gray[700],
        maxWidth: contentWidth,
        lineHeight: 5
      })
      yPosition += 38
      
      // Calculate overall attendance statistics
      const totalStudents = classes.reduce((sum, cls) => sum + (cls.students || 0), 0)
      const weightedAttendance = classes.reduce((sum, cls) => sum + ((cls.attendance || 0) * (cls.students || 0)), 0)
      const averageAttendance = totalStudents > 0 ? Math.round(weightedAttendance / totalStudents) : 0
      const targetAttendance = 85
      
      
      // Attendance metrics
      const attendanceMetrics = [
        { title: 'Average Attendance', value: `${averageAttendance}%`, change: { value: '+4%', type: 'increase' }, color: averageAttendance >= targetAttendance ? colors.success : colors.warning },
        { title: 'Target Attendance', value: `${targetAttendance}%`, change: { value: '0%', type: 'neutral' }, color: colors.gray[600] },
        { title: 'Total Students', value: totalStudents.toString(), change: { value: '+12%', type: 'increase' }, color: colors.primary },
        { title: 'Classes Above Target', value: classes.filter(cls => (cls.attendance || 0) >= targetAttendance).length.toString(), change: { value: '+2%', type: 'increase' }, color: colors.success }
      ]
      
      attendanceMetrics.forEach((metric, index) => {
        const x = margin + (index % 2) * (metricWidth + 10)
        const y = yPosition + Math.floor(index / 2) * (metricHeight + 10)
        
        // Add subtle shadow effect (simulated with rounded rectangles)
        addRoundedRect(x + 1, y + 1, metricWidth, metricHeight, 3, { 
          fill: [248, 248, 248] // Subtle shadow
        })
        
        // Main card with rounded corners
        addRoundedRect(x, y, metricWidth, metricHeight, 3, { 
          fill: [255, 255, 255], // --card: oklch(1 0 0) - pure white
          stroke: [235, 235, 235], // --border: oklch(0.9220 0 0) - light gray border
          lineWidth: 1
        })
        
        addText(metric.title, x + 12, y + 8, { 
          fontSize: 11, 
          style: 'normal', 
          color: [142, 142, 142] // --muted-foreground: oklch(0.5560 0 0)
        })
        addText(metric.value, x + 12, y + 22, { 
          fontSize: 20, 
          style: 'bold', 
          color: [37, 37, 37] // --foreground: oklch(0.1450 0 0) - dark gray
        })
        
        // Percentage change at the bottom with conditional coloring
        if (metric.change) {
          let changeColor = [142, 142, 142] // Default grey
          if (metric.change.type === 'increase') {
            changeColor = colors.success // Green
          } else if (metric.change.type === 'decrease') {
            changeColor = colors.error // Red
          }
          
          addText(metric.change.value, x + 12, y + 32, { 
            fontSize: 11, 
            color: changeColor
          })
        }
      })
      
      yPosition += 90
      
      // Upcoming Events Section
      doc.addPage()
      yPosition = margin
      
      // Add footer to events page
      addFooter()
      
      addText('UPCOMING EVENTS & EXAMS', margin, yPosition, { 
        fontSize: 16, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 10
      addLine(margin, yPosition, pageWidth - margin, yPosition, { color: colors.primary, width: 2 })
      yPosition += 15
      
      // Events Summary Paragraph
      const allEvents = [...exams, ...holidays]
      const totalEvents = allEvents.length
      const upcomingExams = exams.length
      const communityEvents = holidays.length
      const eventsSummary = `This month, Leicester Islamic Centre has ${totalEvents} important events and activities scheduled, including ${upcomingExams} examinations and ${communityEvents} community events. Our academic calendar includes comprehensive assessments to evaluate student progress in Quranic recitation, Islamic studies, and Arabic language proficiency. Community events such as parent-teacher meetings and Islamic celebrations provide opportunities for family engagement and community building. These events are carefully planned to support both academic excellence and community cohesion, ensuring our students receive a well-rounded Islamic education experience. All events are designed to align with our educational objectives and community values.`
      
      addText('MONTHLY EVENTS OVERVIEW', margin, yPosition, { 
        fontSize: 12, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 8
      
      addText(eventsSummary, margin, yPosition, { 
        fontSize: 10, 
        color: colors.gray[700],
        maxWidth: contentWidth,
        lineHeight: 5
      })
      yPosition += 38
      
      // Events table
      const eventHeaders = ['Event', 'Date', 'Type', 'Description']
      const eventColWidths = [35, 25, 20, 70]
      
      // Ensure total width doesn't exceed content width
      const totalEventWidth = eventColWidths.reduce((sum, width) => sum + width, 0)
      if (totalEventWidth > contentWidth) {
        const scaleFactor = contentWidth / totalEventWidth
        eventColWidths.forEach((width, index) => {
          eventColWidths[index] = Math.floor(width * scaleFactor)
        })
      }
      
      xPos = margin
      
      addRect(margin, yPosition, contentWidth, 12, { fill: colors.accent })
      eventHeaders.forEach((header, index) => {
        addText(header, xPos + 3, yPosition + 8, { 
          fontSize: 9, 
          style: 'bold', 
          color: [255, 255, 255] 
        })
        xPos += eventColWidths[index]
      })
      yPosition += 12
      
      allEvents.forEach((event, index) => {
        if (yPosition > pageHeight - 40) {
          doc.addPage()
          yPosition = margin
          addFooter()
        }
        
        if (index % 2 === 0) {
          addRect(margin, yPosition, contentWidth, 10, { fill: colors.gray[50] })
        }
        
        xPos = margin
        const eventData = [
          event.title || event.name,
          event.date ? event.date.toLocaleDateString('en-GB') : event.startDate.toLocaleDateString('en-GB'),
          event.notes ? 'Exam' : 'Holiday',
          event.notes || `${event.startDate.toLocaleDateString('en-GB')} - ${event.endDate.toLocaleDateString('en-GB')}`
        ]
        
        eventData.forEach((data, colIndex) => {
          addText(data, xPos + 3, yPosition + 7, { 
            fontSize: 8, 
            color: colors.gray[700],
            maxWidth: eventColWidths[colIndex] - 6 // Leave 6 units for padding
          })
          xPos += eventColWidths[colIndex]
        })
        yPosition += 18 // Increased row height to accommodate text wrapping
      })
      
      // Footer on last page
      const footerY = pageHeight - 20
      addLine(margin, footerY, pageWidth - margin, footerY, { color: colors.gray[300] })
      addText('Generated by Madrasah OS', margin, footerY + 5, { 
        fontSize: 8, 
        color: colors.gray[500] 
      })
      addText(`Page ${doc.getNumberOfPages()}`, pageWidth - margin - 20, footerY + 5, { 
        fontSize: 8, 
        color: colors.gray[500] 
      })
      
      // Add footer to the last page
      addFooter()
      
      // Generate PDF buffer
      const pdfBuffer = Buffer.from(doc.output('arraybuffer'))

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="madrasah-report-${new Date().toISOString().split('T')[0]}.pdf"`,
          'Cache-Control': 'no-cache'
        }
      })
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError)
      
      // Fallback to HTML if PDF fails
      const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Madrasah Management Report</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; background: #f8fafc; }
          .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 40px; border-radius: 12px; margin-bottom: 30px; }
          .header h1 { margin: 0; font-size: 2.5rem; font-weight: 700; }
          .header p { margin: 5px 0 0 0; opacity: 0.9; }
          .section { background: white; border-radius: 12px; padding: 30px; margin-bottom: 30px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
          .section h2 { color: #1e40af; border-bottom: 3px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
          .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
          .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; text-align: center; }
          .metric-value { font-size: 2rem; font-weight: 700; color: #1e40af; margin: 10px 0; }
          .metric-label { color: #64748b; font-size: 0.9rem; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th { background: #3b82f6; color: white; padding: 12px; text-align: left; font-weight: 600; }
          td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
          tr:nth-child(even) { background: #f8fafc; }
          .status-active { color: #059669; font-weight: 600; }
          .footer { text-align: center; color: #64748b; margin-top: 40px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Madrasah OS</h1>
            <p>Management Report - ${org.name}</p>
            <p>Generated on ${new Date().toLocaleDateString('en-GB')}</p>
          </div>

          <div class="section">
            <h2>Executive Summary</h2>
            <div class="metrics-grid">
              <div class="metric-card">
                <div class="metric-value">${students.length}</div>
                <div class="metric-label">Total Students</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${classes.length}</div>
                <div class="metric-label">Active Classes</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">${staff.length}</div>
                <div class="metric-label">Staff Members</div>
              </div>
              <div class="metric-card">
                <div class="metric-value">£8,500</div>
                <div class="metric-label">Monthly Revenue</div>
              </div>
            </div>
          </div>
        </div>
        <div class="footer">
          <p>Generated by Madrasah OS - Islamic Education Management System</p>
        </div>
      </body>
      </html>
      `

      return new NextResponse(reportHtml, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="madrasah-report-${new Date().toISOString().split('T')[0]}.html"`,
          'Cache-Control': 'no-cache'
        }
      })
    }

  } catch (error) {
    console.error('Error generating report:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    })
    return NextResponse.json({ 
      error: 'Failed to generate report', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
