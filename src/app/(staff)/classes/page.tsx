import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { ClassesList } from '@/components/classes-list'
import { ClassesPageClient } from '@/components/classes-page-client'

export default async function ClassesPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Check if user is a teacher - if so, only show their assigned classes
  const userRole = await getUserRoleInOrg(session.user.id, org.id)
  const membership = await prisma.userOrgMembership.findUnique({
    where: {
      userId_orgId: {
        userId: session.user.id,
        orgId: org.id
      }
    },
    select: {
      staffSubrole: true
    }
  })

  const isTeacher = membership?.staffSubrole === 'TEACHER' || userRole === 'STAFF'

  // Always use real database data
  // Get classes from database - filter by teacher if user is a teacher
  const classes = await prisma.class.findMany({
    where: { 
      orgId: org.id,
      isArchived: false,
      // If user is a teacher, only show classes assigned to them
      ...(isTeacher && { teacherId: session.user.id })
    },
    include: {
      User: {
        select: { name: true, email: true }
      },
      StudentClass: {
        where: {
          Student: {
            isArchived: false
          }
        },
        include: {
          Student: {
            select: { firstName: true, lastName: true, isArchived: true }
          }
        }
      },
      _count: {
        select: { 
          StudentClass: {
            where: {
              Student: {
                isArchived: false
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  // Transform to match expected format
  const filteredClasses = classes.map(cls => ({
    id: cls.id,
    name: cls.name,
    description: cls.description,
    schedule: cls.schedule,
    teacherId: cls.teacherId,
    monthlyFeeP: cls.monthlyFeeP,
    createdAt: cls.createdAt,
    User: cls.User,
    StudentClass: cls.StudentClass,
    _count: cls._count
  }))

  return <ClassesPageClient classes={filteredClasses} />
}
