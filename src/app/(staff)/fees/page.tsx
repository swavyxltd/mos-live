import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { FeesPageClient } from '@/components/fees-page-client'
import { prisma } from '@/lib/prisma'

export default async function FeesPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }
  
  // Get all classes with their student counts and teacher info
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
      _count: {
        select: {
          StudentClass: true
        }
      }
    },
    orderBy: { name: 'asc' }
  })

  // Transform classes data for frontend
  const classesWithFees = classes.map(cls => ({
    id: cls.id,
    name: cls.name,
    description: cls.description || '',
    monthlyFee: cls.monthlyFeeP ? Number(cls.monthlyFeeP) / 100 : 0,
    studentCount: cls._count.StudentClass,
    teacherName: cls.User?.name || 'No Teacher',
    teacherId: cls.teacherId,
    createdAt: cls.createdAt.toISOString(),
    updatedAt: cls.updatedAt.toISOString()
  }))

  // Calculate summary statistics
  const totalClasses = classesWithFees.length
  const totalStudents = classesWithFees.reduce((sum, cls) => sum + cls.studentCount, 0)
  const totalMonthlyRevenue = classesWithFees.reduce((sum, cls) => sum + (cls.monthlyFee * cls.studentCount), 0)
  const classesWithFeesSet = classesWithFees.filter(cls => cls.monthlyFee > 0).length
  const classesWithoutFees = classesWithFees.filter(cls => cls.monthlyFee === 0).length

  return (
    <FeesPageClient 
      classes={classesWithFees}
      summary={{
        totalClasses,
        totalStudents,
        totalMonthlyRevenue,
        classesWithFeesSet,
        classesWithoutFees
      }}
    />
  )
}
