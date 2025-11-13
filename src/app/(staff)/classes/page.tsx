import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { ClassesList } from '@/components/classes-list'
import { ClassesPageClient } from '@/components/classes-page-client'

export default async function ClassesPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Always use real database data
  // Get classes from database
  const classes = await prisma.class.findMany({
    where: { 
      orgId: org.id,
      isArchived: false
    },
    select: {
      id: true,
      name: true,
      description: true,
      schedule: true,
      teacherId: true,
      monthlyFeeP: true,
      createdAt: true,
      teacher: {
        select: { name: true, email: true }
      },
      studentClasses: {
        include: {
          student: {
            select: { firstName: true, lastName: true, isArchived: true }
          }
        },
        where: {
          student: {
            isArchived: false
          }
        }
      },
      _count: {
        select: { 
          studentClasses: {
            where: {
              student: {
                isArchived: false
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return <ClassesPageClient classes={classes} />
}
