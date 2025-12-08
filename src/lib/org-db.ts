/**
 * Multi-tenant database query helpers
 * 
 * These helpers ensure ALL queries are automatically scoped to the authenticated user's orgId,
 * preventing cross-organisation data leaks.
 * 
 * IMPORTANT: Never use raw Prisma queries on multi-tenant tables outside of owner routes.
 * Always use these helpers to ensure orgId is properly enforced.
 */

import { PrismaClient } from '@prisma/client'

/**
 * Get students for a specific organisation
 */
export function orgStudents(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.student.findMany({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get a single student by ID, scoped to org
 */
export function orgStudent(prisma: PrismaClient, orgId: string, studentId: string, args: any = {}) {
  return prisma.student.findUnique({
    ...args,
    where: {
      ...(args.where || {}),
      id: studentId,
      orgId,
    },
  })
}

/**
 * Get first student matching criteria, scoped to org
 */
export function orgStudentFirst(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.student.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Count students for a specific organisation
 */
export function orgStudentsCount(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.student.count({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get classes for a specific organisation
 */
export function orgClasses(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.class.findMany({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get a single class by ID, scoped to org
 */
export function orgClass(prisma: PrismaClient, orgId: string, classId: string, args: any = {}) {
  return prisma.class.findUnique({
    ...args,
    where: {
      ...(args.where || {}),
      id: classId,
      orgId,
    },
  })
}

/**
 * Get first class matching criteria, scoped to org
 */
export function orgClassFirst(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.class.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Count classes for a specific organisation
 */
export function orgClassesCount(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.class.count({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get invoices for a specific organisation
 */
export function orgInvoices(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.invoice.findMany({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get a single invoice by ID, scoped to org
 */
export function orgInvoice(prisma: PrismaClient, orgId: string, invoiceId: string, args: any = {}) {
  return prisma.invoice.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      id: invoiceId,
      orgId,
    },
  })
}

/**
 * Get first invoice matching criteria, scoped to org
 */
export function orgInvoiceFirst(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.invoice.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Count invoices for a specific organisation
 */
export function orgInvoicesCount(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.invoice.count({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get payments for a specific organisation
 */
export function orgPayments(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.payment.findMany({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get a single payment by ID, scoped to org
 */
export function orgPayment(prisma: PrismaClient, orgId: string, paymentId: string, args: any = {}) {
  return prisma.payment.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      id: paymentId,
      orgId,
    },
  })
}

/**
 * Get first payment matching criteria, scoped to org
 */
export function orgPaymentFirst(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.payment.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Count payments for a specific organisation
 */
export function orgPaymentsCount(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.payment.count({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get attendance records for a specific organisation
 */
export function orgAttendance(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.attendance.findMany({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get first attendance record matching criteria, scoped to org
 */
export function orgAttendanceFirst(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.attendance.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Count attendance records for a specific organisation
 */
export function orgAttendanceCount(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.attendance.count({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get messages for a specific organisation
 */
export function orgMessages(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.message.findMany({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get a single message by ID, scoped to org
 */
export function orgMessage(prisma: PrismaClient, orgId: string, messageId: string, args: any = {}) {
  return prisma.message.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      id: messageId,
      orgId,
    },
  })
}

/**
 * Get first message matching criteria, scoped to org
 */
export function orgMessageFirst(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.message.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Count messages for a specific organisation
 */
export function orgMessagesCount(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.message.count({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get applications for a specific organisation
 */
export function orgApplications(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.application.findMany({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get a single application by ID, scoped to org
 */
export function orgApplication(prisma: PrismaClient, orgId: string, applicationId: string, args: any = {}) {
  return prisma.application.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      id: applicationId,
      orgId,
    },
  })
}

/**
 * Get first application matching criteria, scoped to org
 */
export function orgApplicationFirst(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.application.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Count applications for a specific organisation
 */
export function orgApplicationsCount(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.application.count({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get monthly payment records for a specific organisation
 */
export function orgMonthlyPaymentRecords(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.monthlyPaymentRecord.findMany({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get a single monthly payment record by ID, scoped to org
 */
export function orgMonthlyPaymentRecord(prisma: PrismaClient, orgId: string, recordId: string, args: any = {}) {
  return prisma.monthlyPaymentRecord.findUnique({
    ...args,
    where: {
      ...(args.where || {}),
      id: recordId,
      orgId,
    },
  })
}

/**
 * Get first monthly payment record matching criteria, scoped to org
 */
export function orgMonthlyPaymentRecordFirst(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.monthlyPaymentRecord.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Count monthly payment records for a specific organisation
 */
export function orgMonthlyPaymentRecordsCount(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.monthlyPaymentRecord.count({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get student-class enrollments for a specific organisation
 */
export function orgStudentClasses(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.studentClass.findMany({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Get first student-class enrollment matching criteria, scoped to org
 */
export function orgStudentClassFirst(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.studentClass.findFirst({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

/**
 * Count student-class enrollments for a specific organisation
 */
export function orgStudentClassesCount(prisma: PrismaClient, orgId: string, args: any = {}) {
  return prisma.studentClass.count({
    ...args,
    where: {
      ...(args.where || {}),
      orgId,
    },
  })
}

