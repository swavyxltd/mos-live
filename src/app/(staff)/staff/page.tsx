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
  
  // Get staff members from database
  const memberships = await prisma.userOrgMembership.findMany({
    where: {
      orgId: org.id,
      role: { in: ['ADMIN', 'STAFF'] }
    },
    include: {
      user: true,
      org: true
    }
  })

  const teachers = memberships.map(membership => ({
    id: membership.userId,
    name: membership.user.name || '',
    email: membership.user.email || '',
    phone: membership.user.phone || '',
    username: membership.user.email?.split('@')[0] || '',
    isActive: !membership.user.isArchived,
    role: membership.role,
    createdAt: membership.user.createdAt,
    updatedAt: membership.user.updatedAt,
    classes: [], // TODO: Get classes from database
    _count: {
      classes: 0,
      students: 0
    }
  }))

  return (
    <StaffPageWrapper initialTeachers={teachers} />
  )
}
