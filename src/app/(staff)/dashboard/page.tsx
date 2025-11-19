import { DashboardContent } from '@/components/dashboard-content'
import { getDashboardStats } from '@/lib/dashboard-stats'
import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { redirect } from 'next/navigation'

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

  // Block teachers and finance officers from accessing main dashboard
  // Finance Officers should be redirected to finance dashboard
  if (staffSubrole === 'FINANCE_OFFICER') {
    redirect('/finances')
  }

  // Teachers should be redirected to classes page (their main page)
  if (staffSubrole === 'TEACHER') {
    redirect('/classes')
  }

  // Only ADMIN subrole can access the main dashboard
  // Dashboard type is determined by the template/subrole:
  // - ADMIN: Full dashboard
  const teacherId = undefined // Only admins see full dashboard

  // Fetch stats on the server for better performance
  const initialStats = await getDashboardStats(teacherId)
  
  return <DashboardContent initialStats={initialStats} userRole={userRole} staffSubrole={staffSubrole} />
}
