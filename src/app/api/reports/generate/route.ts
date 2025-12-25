export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { checkPaymentMethod } from '@/lib/payment-check'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'

// Type definitions
interface ReportMetrics {
  students: number
  classes: number
  staff: number
  revenue: number
  attendance: number
}

interface PercentageChange {
  value: string
  type: 'increase' | 'decrease' | 'neutral'
}

interface ReportData {
  org: { id: string; name: string; createdAt: Date }
  month: number
  year: number
  current: ReportMetrics
  previous: ReportMetrics
  changes: {
    students: PercentageChange
    classes: PercentageChange
    staff: PercentageChange
    revenue: PercentageChange
    attendance: PercentageChange
  }
  students: Array<{
    firstName: string
    lastName: string
    primaryParent: { name: string; email: string }
    createdAt: Date
  }>
  classes: Array<{
    name: string
    teacher: { name: string }
    description: string
    attendance: number
    students: number
  }>
  invoices: {
    total: number
    pending: number
    overdue: number
  }
  applications: {
    total: number
    accepted: number
  }
  events: {
    exams: Array<{ title: string; date: Date; type: string; description: string | null; startTime: string | null; endTime: string | null }>
    holidays: Array<{ title: string; date: Date; type: string; description: string | null; startTime: string | null; endTime: string | null }>
  }
  // Additional strategic metrics for board presentation
  strategic: {
    studentToStaffRatio: number
    revenuePerStudent: number
    averageClassSize: number
    acceptanceRate: number
    collectionRate: number
    classesAboveTarget: number
    highestAttendance: number
    lowestAttendance: number
    newEnrollments: number
    totalOutstanding: number
  }
}

// Helper functions
function parseMonthYear(body: any): { month: number; year: number } | null {
  let month: number
  let year: number

  // Parse month
  if (typeof body.month === 'number') {
    month = body.month
  } else if (typeof body.month === 'string') {
    month = parseInt(body.month, 10)
  } else {
    return null
  }

  // Parse year
  if (typeof body.year === 'number') {
    year = body.year
  } else if (typeof body.year === 'string') {
    year = parseInt(body.year, 10)
  } else {
    return null
  }

  // Validate ranges
  if (isNaN(month) || month < 0 || month > 11) {
    return null
  }

  if (isNaN(year) || year < 2024 || year > new Date().getFullYear()) {
    return null
  }

  return { month, year }
}

function validateMonthYear(month: number, year: number, orgCreatedAt: Date): { valid: boolean; error?: string } {
    const currentDate = new Date()
    const currentYear = currentDate.getFullYear()
    const currentMonth = currentDate.getMonth()
    const currentDay = currentDate.getDate()
    
    // Can't generate report for future months
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
    return { valid: false, error: 'Cannot generate report for future months' }
    }
    
    // Can't generate report for current month if it's not complete
    if (year === currentYear && month === currentMonth) {
      const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
      if (currentDay < lastDayOfMonth) {
      return { valid: false, error: 'Cannot generate report for incomplete month' }
      }
    }
    
    // Check if requested month is before org was created
    const orgStartDate = new Date(orgCreatedAt)
    const orgStartYear = orgStartDate.getFullYear()
    const orgStartMonth = orgStartDate.getMonth()
    
    if (year < orgStartYear || (year === orgStartYear && month < orgStartMonth)) {
    return { valid: false, error: 'Cannot generate report for months before organisation was created' }
  }

  return { valid: true }
}

function calculatePercentageChange(current: number, previous: number): PercentageChange {
  if (previous === 0) {
    if (current === 0) return { value: '0%', type: 'neutral' }
    // Don't show N/A - return a neutral value instead
    return { value: '0%', type: 'neutral' }
  }
  const change = ((current - previous) / previous) * 100
  const rounded = Math.round(change)
  if (rounded === 0) return { value: '0%', type: 'neutral' }
  if (rounded > 0) return { value: `+${rounded}%`, type: 'increase' }
  return { value: `${rounded}%`, type: 'decrease' }
}

// Check if percentage change is abnormal (likely test data or first month)
function isAbnormalGrowth(change: PercentageChange, current: number, previous: number): boolean {
  if (previous === 0 && current > 0) return true // First month
  if (change.type === 'increase' && change.value.includes('%')) {
    const percent = parseInt(change.value.replace('+', '').replace('%', ''))
    return percent > 1000 // More than 1000% growth is likely abnormal
  }
  return false
}

function formatMonthName(month: number, year: number): string {
  try {
    const date = new Date(year, month)
    return date.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  } catch {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return `${monthNames[month]} ${year}`
  }
}

function formatFilename(month: number, year: number): string {
  const monthNum = month + 1
  const monthStr = monthNum < 10 ? `0${monthNum}` : String(monthNum)
  return `madrasah-report-${year}-${monthStr}.pdf`
}

// Data fetching functions
async function fetchCurrentMonthData(orgId: string, monthStart: Date, monthEnd: Date): Promise<{
  students: any[]
  classes: any[]
  staff: any[]
  invoices: any[]
  applications: any[]
  events: any[]
  attendanceData: Map<string, { present: number; total: number }>
  studentAttendanceData: Map<string, { present: number; total: number }>
  studentInvoices: Map<string, { overdue: number; pending: number }>
}> {
  const [students, classes, staffMemberships, invoices, applications, events] = await Promise.all([
    prisma.student.findMany({
      where: { orgId, isArchived: false },
      include: {
        User: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' }
    }),
    prisma.class.findMany({
      where: { orgId, isArchived: false },
      include: {
        User: { select: { name: true, email: true } },
        StudentClass: { include: { Student: true } }
      }
    }),
    prisma.userOrgMembership.findMany({
      where: { orgId, role: { in: ['ADMIN', 'STAFF'] } },
      include: {
        User: { select: { name: true, email: true } }
      }
    }),
    prisma.invoice.findMany({
      where: {
        orgId,
        createdAt: { gte: monthStart, lte: monthEnd }
      },
          select: {
        id: true,
        studentId: true,
        amountP: true,
        status: true,
        paidAt: true,
        dueDate: true
      }
    }),
    prisma.application.findMany({
      where: {
        orgId,
        createdAt: { gte: monthStart, lte: monthEnd }
      },
      select: {
        id: true,
        status: true,
        createdAt: true
      }
    }),
    prisma.event.findMany({
      where: {
        orgId,
        date: { gte: monthStart, lte: monthEnd }
      },
      select: {
        id: true,
        title: true,
        date: true,
        startTime: true,
        endTime: true,
        description: true,
        type: true
      }
    })
  ])

  // Fetch attendance data for all classes
  const attendanceData = new Map<string, { present: number; total: number }>()
  await Promise.all(
    classes.map(async (cls) => {
      const records = await prisma.attendance.findMany({
        where: {
          classId: cls.id,
          orgId,
          date: { gte: monthStart, lte: monthEnd }
        }
      })
      const present = records.filter(r => r.status === 'PRESENT').length
      attendanceData.set(cls.id, { present, total: records.length })
    })
  )

  // Fetch attendance data per student
  const studentAttendanceData = new Map<string, { present: number; total: number }>()
  const studentIds = students.map(s => s.id)
  if (studentIds.length > 0) {
    const allStudentAttendance = await prisma.attendance.findMany({
      where: {
        studentId: { in: studentIds },
        orgId,
        date: { gte: monthStart, lte: monthEnd }
      },
          select: {
        studentId: true,
        status: true
      }
    })
    
    allStudentAttendance.forEach(att => {
      const entry = studentAttendanceData.get(att.studentId) || { present: 0, total: 0 }
      entry.total++
      if (att.status === 'PRESENT' || att.status === 'LATE') {
        entry.present++
      }
      studentAttendanceData.set(att.studentId, entry)
    })
  }

  // Fetch invoice data per student
  const studentInvoices = new Map<string, { overdue: number; pending: number }>()
  const now = new Date()
  invoices.forEach(inv => {
    if (inv.studentId) {
      const entry = studentInvoices.get(inv.studentId) || { overdue: 0, pending: 0 }
      if (inv.status === 'PENDING') {
        const amount = Number(inv.amountP || 0) / 100
        if (inv.dueDate && new Date(inv.dueDate) < now) {
          entry.overdue += amount
        } else {
          entry.pending += amount
        }
      }
      studentInvoices.set(inv.studentId, entry)
    }
  })

  return {
    students,
    classes,
    staff: staffMemberships.map(m => ({
      user: { name: m.User.name || 'Unknown', email: m.User.email },
      role: m.role
    })),
    invoices,
    applications,
    events,
    attendanceData,
    studentAttendanceData,
    studentInvoices
  }
}

async function fetchPreviousMonthData(orgId: string, prevMonthStart: Date, prevMonthEnd: Date): Promise<ReportMetrics> {
  const [prevStudents, prevClasses, prevStaff, prevInvoices, prevClassesData] = await Promise.all([
    prisma.student.count({
      where: {
        orgId,
        createdAt: { lte: prevMonthEnd },
        OR: [
          { isArchived: false },
          { isArchived: true, archivedAt: { gt: prevMonthEnd } }
        ]
      }
    }),
    prisma.class.count({
      where: {
        orgId,
        createdAt: { lte: prevMonthEnd },
        OR: [
          { isArchived: false },
          { isArchived: true, archivedAt: { gt: prevMonthEnd } }
        ]
      }
    }),
    prisma.userOrgMembership.count({
      where: { orgId, role: { in: ['ADMIN', 'STAFF'] } }
    }),
    prisma.invoice.findMany({
      where: {
        orgId,
        createdAt: { gte: prevMonthStart, lte: prevMonthEnd }
      },
      select: { amountP: true, status: true, paidAt: true }
    }),
    prisma.class.findMany({
      where: { orgId, isArchived: false },
      select: { id: true }
    })
  ])

  const prevPaidInvoices = prevInvoices.filter(inv => inv.status === 'PAID' && inv.paidAt)
  const prevRevenue = prevPaidInvoices.reduce((sum, inv) => {
    const amount = Number(inv.amountP || 0) / 100
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  // Calculate previous month attendance
  const prevAttendanceRecords = await Promise.all(
    prevClassesData.map(async (cls) => {
      return prisma.attendance.findMany({
        where: {
          classId: cls.id,
          orgId,
          date: { gte: prevMonthStart, lte: prevMonthEnd }
        }
      })
    })
  )

  const allPrevRecords = prevAttendanceRecords.flat()
  const prevTotalRecords = allPrevRecords.length
  const prevPresentCount = allPrevRecords.filter(a => a.status === 'PRESENT').length
  const prevAttendance = prevTotalRecords > 0
    ? Math.round((prevPresentCount / prevTotalRecords) * 100)
    : 0
      
      return {
    students: prevStudents,
    classes: prevClasses,
    staff: prevStaff,
    revenue: prevRevenue,
    attendance: prevAttendance
  }
}

function buildReportData(
  org: { id: string; name: string; createdAt: Date },
  month: number,
  year: number,
  currentData: Awaited<ReturnType<typeof fetchCurrentMonthData>>,
  previousMetrics: ReportMetrics
): ReportData & {
  studentInsights: {
    total: number
    newThisMonth: number
    withoutParentAccount: number
    lowAttendance: number
    withOverdueFees: number
  }
  attendanceInsights: {
    classesRequiringAttention: Array<{ name: string; attendance: number; teacher: string }>
    studentsBelow50Percent: number
  }
} {
  // Calculate current metrics
  const students = currentData.students
  const classes = currentData.classes
  const staff = currentData.staff
  const invoices = currentData.invoices
  const applications = currentData.applications
  const events = currentData.events

  // Calculate revenue from REAL paid invoices in the database
  // Only includes invoices that are actually marked as PAID with a paidAt date
  const paidInvoices = invoices.filter(inv => inv.status === 'PAID' && inv.paidAt)
  const revenue = paidInvoices.reduce((sum, inv) => {
    // Convert from pence to pounds (amountP is stored in pence)
    const amount = Number(inv.amountP || 0) / 100
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  // Calculate attendance from REAL attendance records in the database
  // Uses weighted average by class size for accurate representation
  let totalStudentsForAttendance = 0
  let weightedAttendance = 0
  const classesWithStats = classes.map(cls => {
    // Real student count from StudentClass relationships
    const studentCount = cls.StudentClass?.length || 0
    // Real attendance data fetched from attendance table for this class in this month
    const attendanceInfo = currentData.attendanceData.get(cls.id) || { present: 0, total: 0 }
    // Calculate attendance percentage from actual PRESENT vs TOTAL records
    const attendance = attendanceInfo.total > 0
      ? Math.round((attendanceInfo.present / attendanceInfo.total) * 100)
      : 0

    totalStudentsForAttendance += studentCount
    weightedAttendance += attendance * studentCount

    return {
      name: cls.name || 'Unnamed Class', // Fallback only if name is null/undefined
      teacher: { name: cls.User?.name || 'Unassigned' }, // Fallback only if teacher is null/undefined
      description: cls.description || '', // Fallback only if description is null/undefined
      attendance, // Real calculated attendance
      students: studentCount // Real student count
    }
  })

  // Calculate weighted average attendance from REAL data
  const averageAttendance = totalStudentsForAttendance > 0
    ? Math.round(weightedAttendance / totalStudentsForAttendance)
    : 0

  // Calculate financial metrics from REAL invoices in the database
  // Pending invoices: invoices with status PENDING (not yet paid)
  const pendingInvoices = invoices.filter(inv => inv.status === 'PENDING')
  const pendingPayments = pendingInvoices.reduce((sum, inv) => {
    const amount = Number(inv.amountP || 0) / 100
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  // Overdue invoices: PENDING invoices where dueDate has passed
    const now = new Date()
  const overdueInvoices = invoices.filter(inv =>
      inv.status === 'PENDING' && 
      inv.dueDate && 
      new Date(inv.dueDate) < now
    )
  const overduePayments = overdueInvoices.reduce((sum, inv) => {
    const amount = Number(inv.amountP || 0) / 100
    return sum + (isNaN(amount) ? 0 : amount)
  }, 0)

  // Transform students - all data comes from REAL student records in database
  const transformedStudents = students.map(s => ({
    firstName: s.firstName || '', // Real first name from database
    lastName: s.lastName || '', // Real last name from database
    primaryParent: {
      name: s.User?.name || 'Unknown', // Real parent name from User table (fallback only if null)
      email: s.User?.email || '' // Real parent email from User table (fallback only if null)
    },
    createdAt: s.createdAt || new Date() // Real enrollment date from database
  }))

  // Separate events - all events come from REAL event records in database
  const exams = events.filter(e => e.type === 'EXAM') // Real exam events
  const holidays = events.filter(e => e.type === 'HOLIDAY') // Real holiday events

  // Calculate current metrics - ALL from REAL database data
  const currentMetrics: ReportMetrics = {
    students: students.length, // Real count of active students
    classes: classes.length, // Real count of active classes
    staff: staff.length, // Real count of staff members
    revenue, // Real revenue from paid invoices
    attendance: averageAttendance // Real calculated attendance percentage
  }

  // Calculate strategic metrics for board presentation
  const totalOutstanding = pendingPayments + overduePayments
  const acceptedApplications = applications.filter(app => app.status === 'ACCEPTED').length
  const acceptanceRate = applications.length > 0 
    ? Math.round((acceptedApplications / applications.length) * 100)
    : 0
  const collectionRate = (revenue + totalOutstanding) > 0
    ? Math.round((revenue / (revenue + totalOutstanding)) * 100)
    : 0
  const studentToStaffRatio = staff.length > 0
    ? Math.round((students.length / staff.length) * 10) / 10
    : 0
  const revenuePerStudent = students.length > 0
    ? Math.round((revenue / students.length) * 100) / 100
    : 0
  const averageClassSize = classes.length > 0
    ? Math.round(students.length / classes.length)
    : 0
  const classesAboveTarget = classesWithStats.filter(c => c.attendance >= 85).length
  const attendanceValues = classesWithStats.map(c => c.attendance).filter(a => a > 0)
  const highestAttendance = attendanceValues.length > 0 ? Math.max(...attendanceValues) : 0
  const lowestAttendance = attendanceValues.length > 0 ? Math.min(...attendanceValues) : 0

  // Calculate student insights
  const studentsWithoutParent = transformedStudents.filter(s => !s.primaryParent.email || s.primaryParent.email === '').length
  const studentsWithLowAttendance = students.filter(s => {
    if (!currentData.studentAttendanceData) return false
    const attData = currentData.studentAttendanceData.get(s.id)
    if (!attData || attData.total === 0) return false
    const attendancePercent = Math.round((attData.present / attData.total) * 100)
    return attendancePercent < 50
  }).length
  const studentsWithOverdueFees = currentData.studentInvoices 
    ? Array.from(currentData.studentInvoices.entries()).filter(([_, data]) => data.overdue > 0).length
    : 0

  // Calculate attendance insights
  const classesRequiringAttention = classesWithStats
    .filter(c => c.attendance > 0 && c.attendance < 60 && c.students > 0)
    .sort((a, b) => a.attendance - b.attendance)
    .slice(0, 5) // Top 5 worst classes
    .map(c => ({
      name: c.name,
      attendance: c.attendance,
      teacher: c.teacher.name
    }))
  
  const studentsBelow50Percent = students.filter(s => {
    if (!currentData.studentAttendanceData) return false
    const attData = currentData.studentAttendanceData.get(s.id)
    if (!attData || attData.total === 0) return false
    const attendancePercent = Math.round((attData.present / attData.total) * 100)
    return attendancePercent < 50
  }).length

  return {
    org,
    month,
    year,
    current: currentMetrics,
    previous: previousMetrics,
    changes: {
      students: calculatePercentageChange(currentMetrics.students, previousMetrics.students),
      classes: calculatePercentageChange(currentMetrics.classes, previousMetrics.classes),
      staff: calculatePercentageChange(currentMetrics.staff, previousMetrics.staff),
      revenue: calculatePercentageChange(currentMetrics.revenue, previousMetrics.revenue),
      attendance: calculatePercentageChange(currentMetrics.attendance, previousMetrics.attendance)
    },
    students: transformedStudents,
    classes: classesWithStats,
    invoices: {
      total: revenue,
      pending: pendingPayments,
      overdue: overduePayments
    },
    applications: {
      total: applications.length,
      accepted: acceptedApplications
    },
    events: {
      exams,
      holidays
    },
    strategic: {
      studentToStaffRatio,
      revenuePerStudent,
      averageClassSize,
      acceptanceRate,
      collectionRate,
      classesAboveTarget,
      highestAttendance,
      lowestAttendance,
      newEnrollments: acceptedApplications,
      totalOutstanding
    },
    studentInsights: {
      total: transformedStudents.length,
      newThisMonth: acceptedApplications,
      withoutParentAccount: studentsWithoutParent,
      lowAttendance: studentsWithLowAttendance,
      withOverdueFees: studentsWithOverdueFees
    },
    attendanceInsights: {
      classesRequiringAttention,
      studentsBelow50Percent
    }
  }
}

// PDF generation
async function generatePDF(reportData: ReportData & {
  studentInsights: {
    total: number
    newThisMonth: number
    withoutParentAccount: number
    lowAttendance: number
    withOverdueFees: number
  }
  attendanceInsights: {
    classesRequiringAttention: Array<{ name: string; attendance: number; teacher: string }>
    studentsBelow50Percent: number
  }
}): Promise<Buffer> {
  const { jsPDF } = await import('jspdf')
  if (!jsPDF) {
    throw new Error('Failed to import jsPDF')
  }

  const doc = new jsPDF()
  if (!doc) {
    throw new Error('Failed to create jsPDF instance')
  }

  // Design system - Black, Green, Red only
  const colors = {
    // Primary colors - Black
    primary: [0, 0, 0] as [number, number, number], // Black
    primaryForeground: [255, 255, 255] as [number, number, number], // White (for text on black)
    // Background and foreground
    background: [255, 255, 255] as [number, number, number], // White
    foreground: [0, 0, 0] as [number, number, number], // Black text
    // Card colors
    card: [255, 255, 255] as [number, number, number], // White
    cardForeground: [0, 0, 0] as [number, number, number], // Black text
    // Muted colors - use light gray (black with opacity effect)
    muted: [245, 245, 245] as [number, number, number], // Very light gray
    mutedForeground: [100, 100, 100] as [number, number, number], // Medium gray (black variant)
    // Border - light gray (black variant)
    border: [220, 220, 220] as [number, number, number], // Light gray border
    // Success - Green
    success: [34, 197, 94] as [number, number, number], // Green
    // Warning - Red (use red for warnings)
    warning: [239, 68, 68] as [number, number, number], // Red
    // Error - Red
    error: [239, 68, 68] as [number, number, number], // Red
    // Chart colors - use black, green, or red only
    chart1: [0, 0, 0] as [number, number, number], // Black
    chart2: [34, 197, 94] as [number, number, number], // Green
    chart3: [0, 0, 0] as [number, number, number], // Black
    chart4: [34, 197, 94] as [number, number, number], // Green
    // Gray scale for text and borders (black variants)
    gray: {
      50: [250, 250, 250] as [number, number, number],
      100: [245, 245, 245] as [number, number, number],
      200: [220, 220, 220] as [number, number, number],
      300: [200, 200, 200] as [number, number, number],
      400: [150, 150, 150] as [number, number, number],
      500: [100, 100, 100] as [number, number, number],
      600: [80, 80, 80] as [number, number, number],
      700: [60, 60, 60] as [number, number, number],
      800: [0, 0, 0] as [number, number, number], // Black
      900: [0, 0, 0] as [number, number, number] // Black
    }
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
        doc.setLineWidth(options.lineWidth || 1)
        if (options.fill) {
          setFillColor(options.fill)
          doc.roundedRect(x, y, width, height, radius, radius, 'F')
        }
        if (options.stroke) {
          setDrawColor(options.stroke)
          doc.roundedRect(x, y, width, height, radius, radius, 'S')
        }
      }
      
      const addLine = (x1: number, y1: number, x2: number, y2: number, options: any = {}) => {
        setDrawColor(options.color || colors.gray[300])
        doc.setLineWidth(options.width || 0.5)
        doc.line(x1, y1, x2, y2)
      }
      
  const addFooter = () => {
    const footerY = pageHeight - 15
    const footerMargin = 20
    setDrawColor(colors.border)
    doc.setLineWidth(0.5)
    doc.line(footerMargin, footerY - 5, pageWidth - footerMargin, footerY - 5)
    doc.setFontSize(8)
    doc.setFont(undefined, 'normal')
    setColor(colors.mutedForeground)
    doc.text('Generated by Madrasah OS', footerMargin, footerY)
    const pageNum = doc.getCurrentPageInfo().pageNumber
    doc.text(`Page ${pageNum}`, pageWidth - footerMargin - 20, footerY)
  }

  // Page setup
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const margin = 20
      const contentWidth = pageWidth - (margin * 2)
      let yPosition = margin
  let xPos = margin // Declare xPos once at function level

  // Header - Modern design with gradient-like effect
  addRect(0, 0, pageWidth, 70, { fill: colors.primary })
  // Add subtle accent line
  addRect(0, 0, pageWidth, 3, { fill: colors.success })
  
  const monthName = formatMonthName(reportData.month, reportData.year)
  doc.setFontSize(24)
      doc.setFont(undefined, 'bold')
  setColor(colors.primaryForeground)
  doc.text(reportData.org.name, margin, 30)
  doc.setFontSize(16)
      doc.setFont(undefined, 'normal')
  setColor(colors.muted)
  doc.text(`${monthName} Monthly Report`, margin, 48)
  
  // Right side metadata
  doc.setFontSize(9)
  setColor(colors.muted)
  doc.text(`Generated: ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`, pageWidth - margin - 20, 25, { align: 'right' })
  doc.setFontSize(8)
  setColor(colors.gray[400])
  doc.text('Powered by Madrasah OS', pageWidth - margin - 20, 55, { align: 'right' })

  yPosition = 90
  addFooter()

  // Executive Summary - Board-Ready Format with improved styling
  addText('EXECUTIVE SUMMARY', margin, yPosition, {
    fontSize: 20,
    style: 'bold',
    color: colors.primary
  })
  yPosition += 8
  // Accent line with chart color
  addRect(margin, yPosition, 40, 2, { fill: colors.success })
  yPosition += 12

  // Key Highlights Box - Human-readable
  const highlights: string[] = []
  if (reportData.applications.accepted > 0 && !isAbnormalGrowth(reportData.changes.students, reportData.current.students, reportData.previous.students)) {
    highlights.push(`${reportData.applications.accepted} new student${reportData.applications.accepted !== 1 ? 's' : ''} enrolled this month`)
  }
  if (reportData.current.attendance >= 85) {
    highlights.push(`Excellent attendance performance: ${reportData.current.attendance}% average, exceeding our 85% target`)
  } else if (reportData.current.attendance >= 75) {
    highlights.push(`Attendance at ${reportData.current.attendance}% is approaching our 85% target`)
  }
  if (reportData.strategic.classesAboveTarget > 0) {
    highlights.push(`${reportData.strategic.classesAboveTarget} class${reportData.strategic.classesAboveTarget !== 1 ? 'es' : ''} achieving 85%+ attendance`)
  }
  if (reportData.current.revenue > 0 && !isAbnormalGrowth(reportData.changes.revenue, reportData.current.revenue, reportData.previous.revenue)) {
    if (reportData.changes.revenue.type === 'increase' && parseInt(reportData.changes.revenue.value.replace('+', '').replace('%', '')) > 10) {
      highlights.push(`Strong revenue collection: £${reportData.current.revenue.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} collected this month`)
    }
  }
  if (reportData.invoices.overdue === 0 && reportData.invoices.pending === 0 && reportData.current.revenue > 0) {
    highlights.push(`All invoices collected with no outstanding payments`)
  }

  if (highlights.length > 0) {
    // Highlights box with card styling
    const highlightsStartY = yPosition
    const highlightsHeight = highlights.length * 7 + 20
    
    addRoundedRect(margin, highlightsStartY, contentWidth, highlightsHeight, 4, {
      fill: colors.muted,
      stroke: colors.border,
      lineWidth: 1
    })
    
    addText('KEY HIGHLIGHTS', margin + 10, highlightsStartY + 12, {
      fontSize: 12,
        style: 'bold', 
        color: colors.primary 
      })
    yPosition = highlightsStartY + 20
    highlights.forEach((highlight, idx) => {
      addText(`• ${highlight}`, margin + 15, yPosition, {
        fontSize: 10,
        color: colors.foreground,
        maxWidth: contentWidth - 30
      })
      yPosition += 7
    })
    yPosition = highlightsStartY + highlightsHeight + 12
  }

  // Executive Overview - Human-readable summary
  const revenueGrowthText = (() => {
    if (isAbnormalGrowth(reportData.changes.revenue, reportData.current.revenue, reportData.previous.revenue)) {
      // Don't show abnormal growth percentages
      if (reportData.current.revenue > 0 && reportData.previous.revenue === 0) {
        return 'Revenue collection began this month with the onboarding of new students.'
      }
      return ''
    }
    if (reportData.changes.revenue.type === 'increase') {
      const percent = parseInt(reportData.changes.revenue.value.replace('+', '').replace('%', ''))
      if (percent > 20) {
        return 'Revenue increased significantly this month due to improved payment collection and new student enrollments.'
      } else if (percent > 5) {
        return 'Revenue increased this month, reflecting steady growth in collections.'
      } else {
        return 'Revenue remained stable with consistent payment collection.'
      }
    } else if (reportData.changes.revenue.type === 'decrease') {
      return 'Revenue decreased this month. Review payment collection processes and follow up on outstanding invoices.'
    }
    return ''
  })()
  
  const attendanceStatus = reportData.current.attendance >= 85
    ? 'exceeds our target'
    : reportData.current.attendance >= 75
    ? 'approaches our target'
    : 'requires attention'

  const studentChangeText = (() => {
    if (isAbnormalGrowth(reportData.changes.students, reportData.current.students, reportData.previous.students)) {
      if (reportData.current.students > 0 && reportData.previous.students === 0) {
        return `This month marks the beginning of operations with ${reportData.current.students} enrolled student${reportData.current.students !== 1 ? 's' : ''}.`
      }
      return ''
    }
    if (reportData.changes.students.type === 'increase' && reportData.changes.students.value !== '0%') {
      return `Student enrollment increased this month, with ${reportData.strategic.newEnrollments} new student${reportData.strategic.newEnrollments !== 1 ? 's' : ''} joining our programs.`
    } else if (reportData.changes.students.type === 'decrease' && reportData.changes.students.value !== '0%') {
      return 'Student enrollment decreased this month.'
    }
    return ''
  })()

  const summaryText = `This report presents a comprehensive overview of ${reportData.org.name}'s operations for ${monthName}. The institution continues to deliver high-quality Islamic education to ${reportData.current.students} active student${reportData.current.students !== 1 ? 's' : ''} across ${reportData.current.classes} active class${reportData.current.classes !== 1 ? 'es' : ''}, supported by a dedicated team of ${reportData.current.staff} staff member${reportData.current.staff !== 1 ? 's' : ''}. ${studentChangeText} Our average attendance rate of ${reportData.current.attendance}% ${attendanceStatus} of our 85% target. ${reportData.current.revenue > 0 ? `Financial performance shows £${reportData.current.revenue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in collected revenue. ${revenueGrowthText}` : 'Financial data will be available as payment collection begins.'} The madrasah maintains strong operational efficiency with a student-to-staff ratio of ${reportData.strategic.studentToStaffRatio}:1 and an average class size of ${reportData.strategic.averageClassSize} students per class.`
      
      addText('MONTHLY OVERVIEW', margin, yPosition, { 
        fontSize: 12, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 8
  // Overview text in a card
  addRoundedRect(margin, yPosition, contentWidth, 45, 4, {
    fill: colors.card,
    stroke: colors.border,
    lineWidth: 1
  })
  addText(summaryText, margin + 8, yPosition + 8, {
        fontSize: 10, 
    color: colors.foreground,
    maxWidth: contentWidth - 16,
        lineHeight: 5
      })
  yPosition += 55
      
  // Key Performance Indicators - Board Metrics
      const metrics = [
        { 
          title: 'Total Students', 
      value: reportData.current.students.toString(),
      subtitle: `Active Enrollments ${reportData.changes.students.value !== '0%' ? `(${reportData.changes.students.value})` : ''}`,
      change: reportData.changes.students,
          color: colors.primary
        },
        { 
          title: 'Active Classes', 
      value: reportData.current.classes.toString(),
      subtitle: `Currently Running ${reportData.changes.classes.value !== '0%' ? `(${reportData.changes.classes.value})` : ''}`,
      change: reportData.changes.classes,
      color: colors.primary
    },
    {
      title: 'Monthly Revenue',
      value: `£${reportData.current.revenue.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`,
      subtitle: `Collected ${reportData.changes.revenue.value !== '0%' ? `(${reportData.changes.revenue.value})` : ''}`,
      change: reportData.changes.revenue,
      color: colors.success
    },
    {
      title: 'Average Attendance',
      value: `${reportData.current.attendance}%`,
      subtitle: `Target: 85% ${reportData.changes.attendance.value !== '0%' ? `(${reportData.changes.attendance.value})` : ''}`,
      change: reportData.changes.attendance,
      color: reportData.current.attendance >= 85 ? colors.success : colors.warning
    }
  ]

  // Strategic Metrics Section
  yPosition += 10
  addText('STRATEGIC METRICS', margin, yPosition, {
    fontSize: 16,
    style: 'bold',
    color: colors.primary
  })
  yPosition += 8
  addRect(margin, yPosition, 40, 2, { fill: colors.primary })
  yPosition += 15

  const strategicMetrics = [
    {
      title: 'Student-to-Staff Ratio',
      value: `${reportData.strategic.studentToStaffRatio}:1`,
      subtitle: 'Operational Efficiency',
      color: colors.primary
    },
    {
      title: 'Revenue per Student',
      value: `£${reportData.strategic.revenuePerStudent.toFixed(2)}`,
      subtitle: 'Financial Performance',
      color: colors.success
    },
    {
      title: 'Average Class Size',
      value: `${reportData.strategic.averageClassSize}`,
      subtitle: 'Students per Class',
      color: colors.primary
    },
    {
      title: 'Collection Rate',
      value: `${reportData.strategic.collectionRate}%`,
      subtitle: 'Payment Efficiency',
      color: reportData.strategic.collectionRate >= 80 ? colors.success : colors.warning
    },
    {
      title: 'Acceptance Rate',
      value: `${reportData.strategic.acceptanceRate}%`,
      subtitle: `${reportData.applications.total} Applications`,
      color: colors.primary
    },
    {
      title: 'Classes Above Target',
      value: `${reportData.strategic.classesAboveTarget}`,
      subtitle: `of ${reportData.current.classes} Total`,
          color: colors.success
        }
      ]

  const strategicMetricWidth = (contentWidth - 20) / 3
  const strategicMetricHeight = 35

  strategicMetrics.forEach((metric, index) => {
    const x = margin + (index % 3) * (strategicMetricWidth + 10)
    const y = yPosition + Math.floor(index / 3) * (strategicMetricHeight + 10)

    // Subtle shadow effect
    addRoundedRect(x + 1, y + 1, strategicMetricWidth, strategicMetricHeight, 4, { 
      fill: colors.gray[100] 
    })
    // Main card
    addRoundedRect(x, y, strategicMetricWidth, strategicMetricHeight, 4, {
      fill: colors.card,
      stroke: colors.border,
      lineWidth: 1
    })
    // Accent bar at top
    addRoundedRect(x, y, strategicMetricWidth, 3, 4, {
      fill: metric.color
    })

    addText(metric.title, x + 8, y + 10, {
      fontSize: 9,
      style: 'normal',
      color: colors.mutedForeground
    })
    addText(metric.value, x + 8, y + 22, {
      fontSize: 18,
      style: 'bold',
      color: colors.foreground
    })
    addText(metric.subtitle, x + 8, y + 32, {
      fontSize: 8,
      color: colors.mutedForeground
    })
  })

  yPosition += Math.ceil(strategicMetrics.length / 3) * (strategicMetricHeight + 10) + 15
      
      const metricWidth = (contentWidth - 10) / 2
  const metricHeight = 40
      
      metrics.forEach((metric, index) => {
        const x = margin + (index % 2) * (metricWidth + 10)
        const y = yPosition + Math.floor(index / 2) * (metricHeight + 10)
        
    // Subtle shadow
    addRoundedRect(x + 1, y + 1, metricWidth, metricHeight, 4, { 
      fill: colors.gray[100] 
    })
    // Main card
    addRoundedRect(x, y, metricWidth, metricHeight, 4, {
      fill: colors.card,
      stroke: colors.border,
          lineWidth: 1
        })
    // Accent bar
    addRoundedRect(x, y, metricWidth, 3, 4, {
      fill: metric.color
        })
        
    addText(metric.title, x + 12, y + 10, {
          fontSize: 11, 
          style: 'normal', 
      color: colors.mutedForeground
    })
    addText(metric.value, x + 12, y + 25, {
      fontSize: 22,
          style: 'bold', 
      color: colors.foreground
        })
        
        if (metric.change) {
      let changeColor = colors.mutedForeground
          if (metric.change.type === 'increase') {
        changeColor = colors.success
          } else if (metric.change.type === 'decrease') {
        changeColor = colors.error
      }
      addText(metric.change.value, x + 12, y + 36, {
        fontSize: 10,
        style: 'normal',
            color: changeColor
          })
        } else if (metric.subtitle) {
      addText(metric.subtitle, x + 12, y + 36, {
        fontSize: 10,
        color: colors.mutedForeground
          })
        }
      })
      
      // Student Information Section
      doc.addPage()
      yPosition = margin
      addFooter()
      
      addText('STUDENT INFORMATION', margin, yPosition, { 
    fontSize: 18,
        style: 'bold', 
        color: colors.primary 
      })
  yPosition += 8
  addRect(margin, yPosition, 40, 2, { fill: colors.primary })
      yPosition += 10
      
  const studentSummary = `This month, ${reportData.org.name} received ${reportData.applications.total} new student application${reportData.applications.total !== 1 ? 's' : ''} and successfully accepted ${reportData.applications.accepted} new student${reportData.applications.accepted !== 1 ? 's' : ''} into our programs. Our total active student body now stands at ${reportData.current.students} student${reportData.current.students !== 1 ? 's' : ''} across all classes.`
      
      addText('MONTHLY STUDENT OVERVIEW', margin, yPosition, { 
        fontSize: 12, 
        style: 'bold', 
        color: colors.primary 
      })
      yPosition += 8
      addText(studentSummary, margin, yPosition, { 
        fontSize: 10, 
    color: colors.foreground,
        maxWidth: contentWidth,
        lineHeight: 5
      })
  yPosition += 20

  // Student summary cards instead of full list
  const studentMetrics = [
    {
      title: 'Total Students',
      value: reportData.studentInsights.total.toString(),
      subtitle: 'Active Enrollments',
      color: colors.primary
    },
    {
      title: 'New This Month',
      value: reportData.studentInsights.newThisMonth.toString(),
      subtitle: 'Recently Enrolled',
      color: colors.success
    },
    {
      title: 'Without Parent Account',
      value: reportData.studentInsights.withoutParentAccount.toString(),
      subtitle: reportData.studentInsights.withoutParentAccount > 0 ? 'Action Required' : 'All Complete',
      color: reportData.studentInsights.withoutParentAccount > 0 ? colors.warning : colors.success
    },
    {
      title: 'Low Attendance',
      value: reportData.studentInsights.lowAttendance.toString(),
      subtitle: reportData.studentInsights.lowAttendance > 0 ? 'Below 50%' : 'All Above 50%',
      color: reportData.studentInsights.lowAttendance > 0 ? colors.warning : colors.success
    },
    {
      title: 'Overdue Fees',
      value: reportData.studentInsights.withOverdueFees.toString(),
      subtitle: reportData.studentInsights.withOverdueFees > 0 ? 'Follow Up Required' : 'All Current',
      color: reportData.studentInsights.withOverdueFees > 0 ? colors.error : colors.success
    }
  ]

  const studentMetricWidth = (contentWidth - 20) / 3
  const studentMetricHeight = 30

  studentMetrics.forEach((metric, index) => {
    if (index === 3) {
      // Start new row after 3 items
      yPosition += studentMetricHeight + 10
    }
    const x = margin + (index % 3) * (studentMetricWidth + 10)
    const y = yPosition + Math.floor(index / 3) * (studentMetricHeight + 10) - (index >= 3 ? (studentMetricHeight + 10) : 0)

    addRoundedRect(x, y, studentMetricWidth, studentMetricHeight, 4, {
      fill: colors.card,
      stroke: colors.border,
      lineWidth: 1
    })
    addRoundedRect(x, y, studentMetricWidth, 3, 4, {
      fill: metric.color
    })

    addText(metric.title, x + 8, y + 8, {
      fontSize: 9,
      style: 'normal',
      color: colors.mutedForeground
    })
    addText(metric.value, x + 8, y + 18, {
      fontSize: 16,
      style: 'bold',
      color: colors.foreground
    })
    addText(metric.subtitle, x + 8, y + 27, {
      fontSize: 7,
      color: colors.mutedForeground
    })
  })

  yPosition += studentMetricHeight + 15
      
      // Class Information Section
      doc.addPage()
      yPosition = margin
      addFooter()
      
      addText('CLASS INFORMATION', margin, yPosition, { 
    fontSize: 18,
        style: 'bold', 
        color: colors.primary 
      })
  yPosition += 8
  addRect(margin, yPosition, 40, 2, { fill: colors.success })
      yPosition += 10

  const avgClassSize = reportData.current.classes > 0
    ? Math.round(reportData.current.students / reportData.current.classes)
    : 0
  const highestAttendance = reportData.classes.length > 0
    ? Math.max(...reportData.classes.map(c => c.attendance))
    : 0
  const classesAboveTarget = reportData.classes.filter(c => c.attendance >= 85).length

  const classSummary = `Our academic program continues to thrive with ${reportData.current.classes} active class${reportData.current.classes !== 1 ? 'es' : ''} running this month, serving an average of ${avgClassSize} student${avgClassSize !== 1 ? 's' : ''} per class. ${classesAboveTarget > 0 ? `${classesAboveTarget} out of ${reportData.current.classes} class${reportData.current.classes !== 1 ? 'es' : ''} maintain excellent attendance rates above 85%` : ''}${highestAttendance > 0 ? `, with our highest performing class achieving ${highestAttendance}% attendance` : ''}.`
      
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
  const classColWidths = [35, 30, 15, 20, 55]
  const totalClassWidth = classColWidths.reduce((sum, w) => sum + w, 0)
      if (totalClassWidth > contentWidth) {
    const scale = contentWidth / totalClassWidth
    classColWidths.forEach((w, i) => { classColWidths[i] = Math.floor(w * scale) })
  }

  addRoundedRect(margin, yPosition, contentWidth, 12, 2, { fill: colors.primary })
      xPos = margin
  classHeaders.forEach((header, i) => {
    addText(header, xPos + 3, yPosition + 8, { fontSize: 9, style: 'bold', color: colors.primaryForeground })
    xPos += classColWidths[i]
  })
  yPosition += 12

  // Filter out empty classes and sort by attendance (best first, then worst)
  const activeClasses = reportData.classes
    .filter(cls => cls.students > 0) // Hide empty classes
    .sort((a, b) => {
      // Sort: highest attendance first, then lowest
      if (a.attendance === b.attendance) return 0
      if (a.attendance >= 85 && b.attendance < 85) return -1
      if (a.attendance < 85 && b.attendance >= 85) return 1
      return b.attendance - a.attendance
    })

  // Show best and worst classes summary
  if (activeClasses.length > 0) {
    const bestClass = activeClasses[0]
    const worstClass = activeClasses[activeClasses.length - 1]
    
    if (bestClass.attendance > 0 && worstClass.attendance > 0 && bestClass !== worstClass) {
      addText('CLASS PERFORMANCE HIGHLIGHTS', margin, yPosition, {
        fontSize: 11,
          style: 'bold', 
        color: colors.primary
      })
      yPosition += 8
      
      addRoundedRect(margin, yPosition, contentWidth, 20, 4, {
        fill: colors.muted,
        stroke: colors.border,
        lineWidth: 1
      })
      
      addText(`Highest attendance: ${bestClass.name} (${bestClass.attendance}%)`, margin + 10, yPosition + 8, {
        fontSize: 9,
        color: colors.foreground
      })
      addText(`Lowest attendance: ${worstClass.name} (${worstClass.attendance}%)`, margin + 10, yPosition + 15, {
        fontSize: 9,
        color: colors.foreground
      })
      
      yPosition += 28
    }
  }

  // Show classes table (only active classes)
  activeClasses.forEach((cls, index) => {
    if (yPosition > pageHeight - 60) {
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
      cls.teacher.name,
      cls.students.toString(),
      `${cls.attendance}%`,
      (cls.description && cls.description !== 'Demo class' && cls.description.trim() !== '') ? cls.description : '—'
    ]
        classData.forEach((data, colIndex) => {
          addText(data, xPos + 3, yPosition + 7, { 
            fontSize: 8, 
            color: colors.gray[700],
        maxWidth: classColWidths[colIndex] - 6
          })
          xPos += classColWidths[colIndex]
        })
    yPosition += 18
      })
      
  // Financial Summary Section - Enhanced for Board
      doc.addPage()
      yPosition = margin
      addFooter()
      
  addText('FINANCIAL PERFORMANCE', margin, yPosition, {
    fontSize: 18,
        style: 'bold', 
        color: colors.primary 
      })
  yPosition += 8
  addRect(margin, yPosition, 40, 2, { fill: colors.success })
      yPosition += 10

  const totalOutstanding = reportData.strategic.totalOutstanding
  const collectionRate = reportData.strategic.collectionRate
  const revenueGrowth = reportData.changes.revenue.type === 'increase' 
    ? `, representing a ${reportData.changes.revenue.value} growth from the previous month`
    : reportData.changes.revenue.type === 'decrease'
    ? `, a ${reportData.changes.revenue.value} decrease from the previous month`
    : ''

  const financialSummary = `${reportData.org.name} achieved ${reportData.invoices.total > 0 ? 'strong' : 'steady'} financial performance in ${monthName}, collecting £${reportData.invoices.total.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in revenue${revenueGrowth}. The institution maintains a collection rate of ${collectionRate}%${totalOutstanding > 0 ? `, with £${totalOutstanding.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in outstanding payments` : ', with all payments current'}. Revenue per student stands at £${reportData.strategic.revenuePerStudent.toFixed(2)}, ${reportData.strategic.revenuePerStudent >= 2 ? 'meeting' : 'below'} the standard monthly fee target.${reportData.invoices.overdue > 0 ? ` Attention is required for £${reportData.invoices.overdue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in overdue payments.` : ''}`
      
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
    { title: 'Total Revenue Collected', value: `£${reportData.invoices.total.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: colors.success },
    { title: 'Pending Payments', value: `£${reportData.invoices.pending.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: colors.warning },
    { title: 'Overdue Payments', value: `£${reportData.invoices.overdue.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: colors.error },
    { title: 'Total Outstanding', value: `£${totalOutstanding.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`, color: colors.primary }
      ]
      
      financialMetrics.forEach((metric, index) => {
        const x = margin + (index % 2) * (metricWidth + 10)
        const y = yPosition + Math.floor(index / 2) * (metricHeight + 10)
    addRoundedRect(x + 1, y + 1, metricWidth, metricHeight, 3, { fill: [248, 248, 248] })
        addRoundedRect(x, y, metricWidth, metricHeight, 3, { 
      fill: [255, 255, 255],
      stroke: [235, 235, 235],
          lineWidth: 1
        })
    addText(metric.title, x + 12, y + 8, { fontSize: 11, style: 'normal', color: [142, 142, 142] })
    addText(metric.value, x + 12, y + 22, { fontSize: 20, style: 'bold', color: [37, 37, 37] })
      })
      
      // Attendance Summary Section
      doc.addPage()
      yPosition = margin
      addFooter()
      
      addText('ATTENDANCE SUMMARY', margin, yPosition, { 
    fontSize: 18,
        style: 'bold', 
        color: colors.primary 
      })
  yPosition += 8
  addRect(margin, yPosition, 40, 2, { fill: colors.primary })
      yPosition += 10

  const attendanceSummary = `Our attendance performance this month demonstrates ${reportData.current.attendance >= 85 ? 'excellent' : reportData.current.attendance >= 75 ? 'good' : 'requires attention'} student engagement and commitment to Islamic education. With an average attendance rate of ${reportData.current.attendance}%, we are ${reportData.current.attendance >= 85 ? `${reportData.current.attendance - 85} percentage points above` : `${85 - reportData.current.attendance} percentage points below`} our target of 85%. ${classesAboveTarget > 0 ? `${classesAboveTarget} out of ${reportData.current.classes} class${reportData.current.classes !== 1 ? 'es' : ''} have achieved attendance rates above our target` : 'No classes have yet reached our 85% target'}.`
      
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
      
      const attendanceMetrics = [
    { title: 'Average Attendance', value: `${reportData.current.attendance}%`, change: reportData.changes.attendance, color: reportData.current.attendance >= 85 ? colors.success : colors.warning },
    { title: 'Target Attendance', value: '85%', change: { value: '0%', type: 'neutral' as const }, color: colors.primary },
    { title: 'Total Students', value: reportData.current.students.toString(), change: reportData.changes.students, color: colors.primary },
    { title: 'Classes Above Target', value: classesAboveTarget.toString(), change: { value: '0%', type: 'neutral' as const }, color: colors.success }
      ]
      
      attendanceMetrics.forEach((metric, index) => {
        const x = margin + (index % 2) * (metricWidth + 10)
        const y = yPosition + Math.floor(index / 2) * (metricHeight + 10)
    addRoundedRect(x + 1, y + 1, metricWidth, metricHeight, 3, { fill: [248, 248, 248] })
        addRoundedRect(x, y, metricWidth, metricHeight, 3, { 
      fill: [255, 255, 255],
      stroke: [235, 235, 235],
          lineWidth: 1
        })
    addText(metric.title, x + 12, y + 8, { fontSize: 11, style: 'normal', color: [142, 142, 142] })
    addText(metric.value, x + 12, y + 22, { fontSize: 20, style: 'bold', color: [37, 37, 37] })
        if (metric.change) {
      let changeColor = [142, 142, 142]
          if (metric.change.type === 'increase') {
        changeColor = colors.success
          } else if (metric.change.type === 'decrease') {
        changeColor = colors.error
      }
      addText(metric.change.value, x + 12, y + 32, { fontSize: 11, color: changeColor })
    }
  })

  // Events Section
      doc.addPage()
      yPosition = margin
      addFooter()
      
      addText('UPCOMING EVENTS & EXAMS', margin, yPosition, { 
    fontSize: 18,
        style: 'bold', 
        color: colors.primary 
      })
  yPosition += 8
  addRect(margin, yPosition, 40, 2, { fill: colors.success })
      yPosition += 10
      addLine(margin, yPosition, pageWidth - margin, yPosition, { color: colors.primary, width: 2 })
      yPosition += 15
      
  const allEvents = [...reportData.events.exams, ...reportData.events.holidays]
  const eventsSummary = `This month, ${reportData.org.name} has ${allEvents.length} important events and activities scheduled, including ${reportData.events.exams.length} examinations and ${reportData.events.holidays.length} community events.`
      
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
  const totalEventWidth = eventColWidths.reduce((sum, w) => sum + w, 0)
      if (totalEventWidth > contentWidth) {
    const scale = contentWidth / totalEventWidth
    eventColWidths.forEach((w, i) => { eventColWidths[i] = Math.floor(w * scale) })
  }

  addRoundedRect(margin, yPosition, contentWidth, 12, 2, { fill: colors.primary })
      xPos = margin
  eventHeaders.forEach((header, i) => {
    addText(header, xPos + 3, yPosition + 8, { fontSize: 9, style: 'bold', color: colors.primaryForeground })
    xPos += eventColWidths[i]
      })
      yPosition += 12
      
      allEvents.forEach((event, index) => {
    if (yPosition > pageHeight - 60) {
          doc.addPage()
          yPosition = margin
          addFooter()
        }
        if (index % 2 === 0) {
          addRect(margin, yPosition, contentWidth, 10, { fill: colors.gray[50] })
        }
        xPos = margin
    const eventDate = new Date(event.date)
        const eventData = [
      event.title || 'Untitled Event',
      eventDate.toLocaleDateString('en-GB'),
      event.type === 'EXAM' ? 'Exam' : 'Holiday',
      event.description || (event.startTime && event.endTime ? `${event.startTime} - ${event.endTime}` : eventDate.toLocaleDateString('en-GB'))
    ]
        eventData.forEach((data, colIndex) => {
          addText(data, xPos + 3, yPosition + 7, { 
            fontSize: 8, 
            color: colors.gray[700],
        maxWidth: eventColWidths[colIndex] - 6
          })
          xPos += eventColWidths[colIndex]
        })
    yPosition += 18
  })

  // Key Insights & Strategic Recommendations
  doc.addPage()
  yPosition = margin
  addFooter()

  addText('KEY INSIGHTS & STRATEGIC OVERVIEW', margin, yPosition, {
    fontSize: 18,
    style: 'bold',
    color: colors.primary
  })
  yPosition += 8
  addRect(margin, yPosition, 40, 2, { fill: colors.success })
  yPosition += 10

  // Build insights
  const insights: string[] = []

  // Operational Insights
  if (reportData.current.attendance >= 85) {
    insights.push(`Excellent attendance performance: ${reportData.current.attendance}% average, with ${reportData.strategic.classesAboveTarget} classes exceeding the 85% target`)
  } else if (reportData.current.attendance < 75) {
    insights.push(`Attendance requires attention: ${reportData.current.attendance}% average, ${85 - reportData.current.attendance} percentage points below target`)
  }

  if (reportData.strategic.highestAttendance > 0 && reportData.strategic.lowestAttendance > 0) {
    insights.push(`Attendance range: ${reportData.strategic.highestAttendance}% (highest) to ${reportData.strategic.lowestAttendance}% (lowest)`)
  }

  // Growth Insights
  if (reportData.changes.students.type === 'increase') {
    insights.push(`Student enrollment growth: ${reportData.changes.students.value} increase, with ${reportData.strategic.newEnrollments} new students enrolled this month`)
  } else if (reportData.changes.students.type === 'decrease') {
    insights.push(`Student enrollment: ${reportData.changes.students.value} decrease from previous month`)
  }

  // Financial Insights
  if (reportData.strategic.collectionRate < 80) {
    insights.push(`Collection rate below optimal: ${reportData.strategic.collectionRate}% (target: 80%+)`)
  } else {
    insights.push(`Strong payment collection: ${reportData.strategic.collectionRate}% collection rate`)
  }

  if (reportData.invoices.overdue > 0) {
    insights.push(`Overdue payments: £${reportData.invoices.overdue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} requires immediate attention`)
  }

  // Operational Efficiency
  if (reportData.strategic.studentToStaffRatio > 15) {
    insights.push(`High student-to-staff ratio: ${reportData.strategic.studentToStaffRatio}:1 may impact individual attention`)
  } else {
    insights.push(`Optimal staffing levels: ${reportData.strategic.studentToStaffRatio}:1 student-to-staff ratio supports quality education`)
  }

  if (reportData.strategic.averageClassSize > 20) {
    insights.push(`Large average class size: ${reportData.strategic.averageClassSize} students per class`)
  }

  // Application Insights
  if (reportData.applications.total > 0) {
    insights.push(`Application processing: ${reportData.applications.total} applications received, ${reportData.strategic.acceptanceRate}% acceptance rate`)
  }

  // Add Insights Section
  addText('OPERATIONAL INSIGHTS', margin, yPosition, {
    fontSize: 12,
    style: 'bold',
    color: colors.primary
  })
  yPosition += 8

  insights.forEach((insight) => {
    // Check if we need a new page - leave more space for footer
    if (yPosition > pageHeight - 60) {
      doc.addPage()
      yPosition = margin
      addFooter()
      yPosition += 15
    }
    addText(`• ${insight}`, margin + 5, yPosition, {
      fontSize: 10,
      color: colors.gray[700],
      maxWidth: contentWidth - 10,
      lineHeight: 5
    })
    yPosition += 12
  })

  // Actions for Next Month Page
  doc.addPage()
  yPosition = margin
  addFooter()

  addText('RECOMMENDED FOCUS FOR NEXT MONTH', margin, yPosition, {
    fontSize: 18,
    style: 'bold',
    color: colors.primary
  })
  yPosition += 8
  addRect(margin, yPosition, 40, 2, { fill: colors.success })
  yPosition += 15

  const nextMonthActions: string[] = []

  // Attendance actions
  if (reportData.attendanceInsights.classesRequiringAttention.length > 0) {
    const classNames = reportData.attendanceInsights.classesRequiringAttention.map(c => c.name).join(', ')
    nextMonthActions.push(`Improve attendance in ${reportData.attendanceInsights.classesRequiringAttention.length} class${reportData.attendanceInsights.classesRequiringAttention.length !== 1 ? 'es' : ''} below 60%: ${classNames}`)
  }

  // Financial actions
  if (reportData.invoices.overdue > 0) {
    const overdueCount = reportData.studentInsights.withOverdueFees
    nextMonthActions.push(`Follow up on £${reportData.invoices.overdue.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} overdue payments from ${overdueCount} famil${overdueCount !== 1 ? 'ies' : 'y'}`)
  } else if (reportData.invoices.pending > 0) {
    nextMonthActions.push(`Follow up on £${reportData.invoices.pending.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} in pending payments`)
  }

  // Student onboarding actions
  if (reportData.studentInsights.withoutParentAccount > 0) {
    nextMonthActions.push(`Complete parent onboarding for ${reportData.studentInsights.withoutParentAccount} student${reportData.studentInsights.withoutParentAccount !== 1 ? 's' : ''} without parent accounts`)
  }

  // Low attendance students
  if (reportData.attendanceInsights.studentsBelow50Percent > 0) {
    nextMonthActions.push(`Review and follow up with ${reportData.attendanceInsights.studentsBelow50Percent} student${reportData.attendanceInsights.studentsBelow50Percent !== 1 ? 's' : ''} below 50% attendance`)
  }

  // General attendance improvement
  if (reportData.current.attendance < 75) {
    nextMonthActions.push(`Review timetable or staffing if attendance remains below 75%`)
  }

  if (nextMonthActions.length === 0) {
    nextMonthActions.push('Continue maintaining current performance levels')
    nextMonthActions.push('Focus on student engagement and parent communication')
  }

  nextMonthActions.forEach((action, index) => {
    if (yPosition > pageHeight - 60) {
      doc.addPage()
      yPosition = margin
      addFooter()
      yPosition += 15
    }

    addRoundedRect(margin, yPosition, contentWidth, 25, 4, {
      fill: colors.card,
      stroke: colors.border,
      lineWidth: 1
    })

    addText(`${index + 1}.`, margin + 10, yPosition + 10, {
      fontSize: 12,
      style: 'bold',
      color: colors.primary
    })

    addText(action, margin + 25, yPosition + 10, {
      fontSize: 10,
      color: colors.foreground,
      maxWidth: contentWidth - 35,
      lineHeight: 5
    })

    yPosition += 30
  })

  // Final footer
      addFooter()
      
      // Generate PDF buffer
  const pdfOutput = doc.output('arraybuffer')
  if (!pdfOutput || !(pdfOutput instanceof ArrayBuffer)) {
    throw new Error('Invalid PDF output')
  }

  const pdfBytes = new Uint8Array(pdfOutput)
  if (pdfBytes.length === 0) {
    throw new Error('PDF output is empty')
  }

  const header = String.fromCharCode(pdfBytes[0], pdfBytes[1], pdfBytes[2], pdfBytes[3])
  if (header !== '%PDF') {
    throw new Error('Invalid PDF header')
  }

  return Buffer.from(pdfOutput)
}

// Main handler
async function handlePOST(request: NextRequest) {
  try {
    // Authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get organization
    const org = await getActiveOrg()
    if (!org) {
      return NextResponse.json({ error: 'No organisation found' }, { status: 404 })
    }

    // Check payment method
    const hasPaymentMethod = await checkPaymentMethod()
    if (!hasPaymentMethod) {
      return NextResponse.json(
        { error: 'Payment method required. Please set up a payment method to generate reports.' },
        { status: 402 }
      )
    }

    // Parse and validate request
    const body = await request.json()
    const parsed = parseMonthYear(body)
    if (!parsed) {
      return NextResponse.json(
        { error: 'Invalid month or year. Month must be 0-11, year must be 2024 or later.' },
        { status: 400 }
      )
    }

    const { month, year } = parsed

    // Validate month/year against org and current date
    const validation = validateMonthYear(month, year, org.createdAt)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Calculate date ranges
    const monthStart = new Date(year, month, 1)
    const monthEnd = new Date(year, month + 1, 0, 23, 59, 59)
    const prevMonth = month === 0 ? 11 : month - 1
    const prevYear = month === 0 ? year - 1 : year
    const prevMonthStart = new Date(prevYear, prevMonth, 1)
    const prevMonthEnd = new Date(prevYear, prevMonth + 1, 0, 23, 59, 59)

    // Fetch data
    const [currentData, previousMetrics] = await Promise.all([
      fetchCurrentMonthData(org.id, monthStart, monthEnd),
      fetchPreviousMonthData(org.id, prevMonthStart, prevMonthEnd)
    ])

    // Build report data
    const reportData = buildReportData(org, month, year, currentData, previousMetrics)

    // Generate PDF
    try {
      const pdfBuffer = await generatePDF(reportData)
      const filename = formatFilename(month, year)

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': pdfBuffer.length.toString(),
          'Cache-Control': 'no-cache'
        }
      })
    } catch (pdfError: any) {
      logger.error('PDF generation error', {
        error: pdfError,
        message: pdfError?.message,
        stack: pdfError?.stack
      })

      const errorMessage = pdfError?.message ? String(pdfError.message) : 'Unknown PDF generation error'
      const isDevelopment = process.env.NODE_ENV === 'development'

      return NextResponse.json({
        error: 'Failed to generate PDF report',
        details: errorMessage,
        ...(isDevelopment && pdfError?.stack && { stack: String(pdfError.stack) })
      }, { status: 500 })
    }
  } catch (error: any) {
    logger.error('Error generating report', {
      error,
      message: error?.message,
      stack: error?.stack
    })

    const isDevelopment = process.env.NODE_ENV === 'development'
    let errorMessage = 'Unknown error occurred'
    
    try {
      if (error?.message) {
        errorMessage = String(error.message)
      } else if (typeof error === 'string') {
        errorMessage = error
      } else if (error && typeof error === 'object' && 'message' in error) {
        errorMessage = String(error.message)
      }
    } catch {
      errorMessage = 'Error occurred while extracting error message'
    }

    return NextResponse.json({ 
      error: 'Failed to generate report',
      details: isDevelopment ? errorMessage : 'An error occurred while generating the report. Please try again later.',
      ...(isDevelopment && error?.stack && { stack: String(error.stack) })
    }, { status: 500 })
  }
}

export const POST = withRateLimit(handlePOST)
