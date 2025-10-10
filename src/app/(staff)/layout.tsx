import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { Page } from '@/components/shell/page'

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  // Check if we're in demo mode first
  const { isDemoMode, DEMO_ORG } = await import('@/lib/demo-mode')
  
  if (!session?.user && !isDemoMode()) {
    redirect('/auth/signin')
  }
  
  // Handle demo mode without session
  if (isDemoMode() && !session?.user) {
    const demoOrg = DEMO_ORG
    const userRole = 'TEACHER' // Default role for demo users
    const demoUser = {
      id: 'demo-teacher-1',
      email: 'teacher@demo.com',
      name: 'Demo Teacher',
      image: null
    }
    
    return (
      <Page
        user={demoUser}
        org={demoOrg}
        userRole={userRole}
        title="Staff Portal"
        breadcrumbs={[{ label: 'Dashboard' }]}
      >
        {children}
      </Page>
    )
  }

  const org = await getActiveOrg()
  if (!org) {
    // Check if this is a demo user and we're in development
    if (isDemoMode() || (process.env.NODE_ENV !== 'production' && session?.user?.id?.startsWith('demo-'))) {
      // Use demo org for demo users
      const demoOrg = DEMO_ORG
      const userRole = 'TEACHER' // Default role for demo users
      
      return (
        <Page
          user={session.user}
          org={demoOrg}
          userRole={userRole}
          title="Staff Portal"
          breadcrumbs={[{ label: 'Dashboard' }]}
        >
          {children}
        </Page>
      )
    }
    redirect('/auth/signin?error=NoOrganization')
  }
  
  // Check if we're in demo mode
  const { DEMO_USERS } = await import('@/lib/demo-mode')
  let userRole = null
  
  if (isDemoMode()) {
    // In demo mode, get role from demo users
    const demoUser = Object.values(DEMO_USERS).find(u => u.id === session.user.id)
    userRole = demoUser?.role || 'TEACHER'
  } else {
    userRole = await getUserRoleInOrg(session.user.id, org.id)
    if (!userRole) {
      redirect('/auth/signin?error=NotMember')
    }
  }
  
  return (
    <Page
      user={session.user}
      org={org}
      userRole={userRole}
      title="Staff Portal"
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      {children}
    </Page>
  )
}
