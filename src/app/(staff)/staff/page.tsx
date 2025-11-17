import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { StaffPageWrapper } from '@/components/staff-page-wrapper'

export default async function StaffPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Always use real database data
  const { prisma } = await import('@/lib/prisma')
  
  // Get staff members from database with their classes and student counts
  const memberships = await prisma.userOrgMembership.findMany({
    where: {
      orgId: org.id,
      role: { in: ['ADMIN', 'STAFF'] }
    },
    include: {
      User: {
        include: {
          Class: {
            where: {
              orgId: org.id,
              isArchived: false
            },
            include: {
              StudentClass: {
                where: {
                  Student: {
                    isArchived: false
                  }
                },
                select: {
                  studentId: true
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
            }
          }
        }
      },
      Org: true
    }
  })

  const teachers = memberships.map(membership => {
    const classes = membership.User.Class || []
    const totalStudents = classes.reduce((sum, cls) => sum + (cls._count?.StudentClass || 0), 0)
    
    return {
      id: membership.userId,
      name: membership.User.name || '',
      email: membership.User.email || '',
      phone: membership.User.phone || '',
      username: membership.User.email?.split('@')[0] || '',
      isActive: !membership.User.isArchived,
      role: membership.role,
      createdAt: membership.User.createdAt ? membership.User.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: membership.User.updatedAt ? membership.User.updatedAt.toISOString() : new Date().toISOString(),
      classes: classes.map(cls => ({
        id: cls.id,
        name: cls.name,
        students: cls._count?.StudentClass || 0
      })),
      _count: {
        classes: classes.length,
        students: totalStudents
      }
    }
  })

  return (
    <StaffPageWrapper initialTeachers={teachers} />
  )
}
