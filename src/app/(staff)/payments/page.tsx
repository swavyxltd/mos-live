import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { PaymentsPageClient } from '@/components/payments-page-client'
import { prisma } from '@/lib/prisma'
import { calculatePaymentStatus } from '@/lib/payment-status'

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Get current month for determining overdue
  const now = new Date()
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  
  // Get all classes with their students and payment records
  const classes = await prisma.class.findMany({
    where: {
      orgId: org.id,
      isArchived: false
    },
    include: {
      User: {
        select: {
          id: true,
          name: true,
          email: true
        }
      },
      StudentClass: {
        where: {
          Student: {
            isArchived: false
          }
        },
        include: {
          Student: {
            include: {
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        }
      },
      MonthlyPaymentRecord: {
        where: {
          Student: {
            isArchived: false
          }
        },
        include: {
          Student: {
            include: {
              User: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        },
        orderBy: {
          month: 'desc'
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  // Transform classes with payment statistics
  const classesWithStats = classes.map(cls => {
    // Get payment records for current and recent months (last 6 months)
    const sixMonthsAgo = new Date(now)
    sixMonthsAgo.setMonth(now.getMonth() - 6)
    const sixMonthsAgoStr = `${sixMonthsAgo.getFullYear()}-${String(sixMonthsAgo.getMonth() + 1).padStart(2, '0')}`
    
    const recentRecords = cls.MonthlyPaymentRecord.filter(record => {
      // Include records from last 6 months or any unpaid records
      return record.month >= sixMonthsAgoStr || record.status !== 'PAID'
    })

    // Update payment statuses based on due dates before calculating stats
    const updatedRecords = recentRecords.map(record => {
      const newStatus = calculatePaymentStatus(
        record.status,
        record.month,
        cls.feeDueDay || null,
        record.paidAt
      )
      return { ...record, status: newStatus }
    })

    // Calculate stats
    const paid = updatedRecords.filter(r => r.status === 'PAID').length
    const late = updatedRecords.filter(r => r.status === 'LATE').length
    const overdue = updatedRecords.filter(r => r.status === 'OVERDUE').length

    return {
      id: cls.id,
      name: cls.name,
      teacher: cls.User?.name || 'No Teacher',
      studentCount: cls.StudentClass.length,
      paid,
      late,
      overdue,
      students: cls.StudentClass.map(sc => ({
        id: sc.Student.id,
        firstName: sc.Student.firstName,
        lastName: sc.Student.lastName,
        parentName: sc.Student.User?.name || '',
        parentEmail: sc.Student.User?.email || '',
        parentPhone: sc.Student.User?.phone || ''
      })).sort((a, b) => {
        const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
        if (lastNameCompare !== 0) return lastNameCompare
        return (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
      }),
      paymentRecords: updatedRecords
        .map(record => ({
          id: record.id,
          studentId: record.Student.id,
          studentName: `${record.Student.firstName} ${record.Student.lastName}`,
          firstName: record.Student.firstName,
          lastName: record.Student.lastName,
          month: record.month,
          amountP: record.amountP,
          method: record.method,
          status: record.status,
          paidAt: record.paidAt?.toISOString() || null,
          notes: record.notes,
          reference: record.reference,
          parentName: record.Student.User?.name || '',
          parentEmail: record.Student.User?.email || '',
          parentPhone: record.Student.User?.phone || ''
        }))
        .sort((a, b) => {
          const lastNameCompare = (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
          if (lastNameCompare !== 0) return lastNameCompare
          return (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
        })
    }
  })

  return <PaymentsPageClient classes={classesWithStats} />
}
