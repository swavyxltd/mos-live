import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { ClassesList } from '@/components/classes-list'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import Link from 'next/link'

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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Classes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your classes and student enrollments.
          </p>
        </div>
        <Link href="/classes/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Class
          </Button>
        </Link>
      </div>

      <ClassesList classes={classes} />
    </div>
  )
}
