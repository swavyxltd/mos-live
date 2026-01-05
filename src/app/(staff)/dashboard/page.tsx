import { DashboardContent } from '@/components/dashboard-content'
import { getDashboardStats } from '@/lib/dashboard-stats'
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

// This page uses dynamic functions (getServerSession, cookies) so it must be dynamic
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Dashboard | Madrasah OS',
  description: 'Staff dashboard overview',
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  const org = await getActiveOrg(session.user.id)
  if (!org) {
    redirect('/auth/signin')
  }

  const userRole = await getUserRoleInOrg(session.user.id, org.id)
  
  // Get membership to check subrole
  const membership = await prisma.userOrgMembership.findUnique({
    where: {
      userId_orgId: {
        userId: session.user.id,
        orgId: org.id,
      },
    },
  })

  const staffSubrole = membership?.staffSubrole || (userRole === 'ADMIN' ? 'ADMIN' : 'TEACHER')

  // Block finance officers from accessing main dashboard
  // Finance Officers should be redirected to finance dashboard
  if (staffSubrole === 'FINANCE_OFFICER') {
    redirect('/finances')
  }

  // Dashboard type is determined by the template/subrole:
  // - ADMIN: Full dashboard (all org stats)
  // - TEACHER: Teacher dashboard (stats for their classes only)
  const teacherId = staffSubrole === 'TEACHER' ? session.user.id : undefined

  // Fetch stats on the server for better performance
  // If teacherId is provided, stats will be filtered to only their classes
  const initialStats = await getDashboardStats(teacherId)
  
  return <DashboardContent initialStats={initialStats} userRole={userRole} staffSubrole={staffSubrole} orgCreatedAt={org.createdAt} />
}
