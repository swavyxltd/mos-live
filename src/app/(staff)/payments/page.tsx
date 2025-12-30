import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { PaymentsPageClient } from '@/components/payments-page-client'
import { prisma } from '@/lib/prisma'
import { calculatePaymentStatus } from '@/lib/payment-status'
import { getBillingDay } from '@/lib/billing-day'

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
        },
        take: 1000 // Get all records (increase if needed)
      }
    },
    orderBy: { name: 'asc' }
  })

  // Transform classes with payment statistics
  // Get org billing day setting (can be null)
  const orgBillingDay = getBillingDay(org)

  // Fetch all parent billing profiles for students in this org to get preferred payment methods
  const parentUserIds = new Set<string>()
  classes.forEach(cls => {
    cls.StudentClass.forEach(sc => {
      if (sc.Student.User?.id) {
        parentUserIds.add(sc.Student.User.id)
      }
    })
  })

  const billingProfiles = parentUserIds.size > 0
    ? await prisma.parentBillingProfile.findMany({
        where: {
          orgId: org.id,
          parentUserId: { in: Array.from(parentUserIds) }
        },
        select: {
          parentUserId: true,
          preferredPaymentMethod: true
        }
      })
    : []

  const billingProfileMap = new Map(
    billingProfiles.map(bp => [bp.parentUserId, bp.preferredPaymentMethod])
  )

  const classesWithStats = classes.map(cls => {
    // Include all payment records (no filtering by date)
    const recentRecords = cls.MonthlyPaymentRecord

    // Update payment statuses based on due dates before calculating stats
    const updatedRecords = recentRecords.map(record => {
      const newStatus = calculatePaymentStatus(
        record.status,
        record.month,
        orgBillingDay,
        record.paidAt
      )
      // Get parent's preferred payment method as fallback if record.method is null
      const parentPreferredMethod = record.Student.User?.id
        ? billingProfileMap.get(record.Student.User.id) || null
        : null
      const displayMethod = record.method || parentPreferredMethod
      return { ...record, status: newStatus, displayMethod }
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
        const firstNameCompare = (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
        if (firstNameCompare !== 0) return firstNameCompare
        return (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
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
          method: (record as any).displayMethod || record.method,
          status: record.status,
          paidAt: record.paidAt?.toISOString() || null,
          notes: record.notes,
          reference: record.reference,
          parentName: record.Student.User?.name || '',
          parentEmail: record.Student.User?.email || '',
          parentPhone: record.Student.User?.phone || ''
        }))
        .sort((a, b) => {
          const firstNameCompare = (a.firstName || '').localeCompare(b.firstName || '', undefined, { sensitivity: 'base' })
          if (firstNameCompare !== 0) return firstNameCompare
          return (a.lastName || '').localeCompare(b.lastName || '', undefined, { sensitivity: 'base' })
        })
    }
  })

  return <PaymentsPageClient classes={classesWithStats} />
}
