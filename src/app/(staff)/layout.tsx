import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveOrg, getUserRoleInOrg, getUserOrgs, setActiveOrgId } from '@/lib/org'
import { Page } from '@/components/shell/page'
import { StaffLayoutWrapper } from '@/components/staff-layout-wrapper'

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
    const userRole = 'STAFF' // Default role for demo users
    const demoUser = {
      id: 'demo-staff-1',
      email: 'staff@demo.com',
      name: 'Demo Staff',
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
        <StaffLayoutWrapper userRole={userRole}>
          {children}
        </StaffLayoutWrapper>
      </Page>
    )
  }

  let org = await getActiveOrg()
  if (!org) {
    // Check if this is a demo user and we're in development
    if (isDemoMode() || (process.env.NODE_ENV !== 'production' && session?.user?.id?.startsWith('demo-'))) {
      // Use demo org for demo users
      const demoOrg = DEMO_ORG
      const userRole = 'STAFF' // Default role for demo users
      
      return (
        <Page
          user={session.user}
          org={demoOrg}
          userRole={userRole}
          title="Staff Portal"
          breadcrumbs={[{ label: 'Dashboard' }]}
        >
          <StaffLayoutWrapper userRole={userRole}>
            {children}
          </StaffLayoutWrapper>
        </Page>
      )
    }
    
    // Try to automatically set the active org from user's organizations
    if (session?.user?.id) {
      try {
        const userOrgs = await getUserOrgs(session.user.id)
        if (userOrgs && userOrgs.length > 0) {
          // Use the first organization (or prioritize admin orgs)
          // userOrgs is an array of UserOrgMembership objects with included org
          const adminOrg = userOrgs.find((uo: any) => uo.role === 'ADMIN')
          const selectedOrg = adminOrg || userOrgs[0]
          
          // Type guard to ensure org exists
          if (selectedOrg && typeof selectedOrg === 'object' && 'org' in selectedOrg && selectedOrg.org) {
            await setActiveOrgId(selectedOrg.org.id)
            org = selectedOrg.org
          }
        }
      } catch (error) {
        console.error('Error setting active org:', error)
        // Fall through to redirect if org setting fails
      }
    }
    
    // If still no org, redirect
    if (!org) {
      redirect('/auth/signin?error=NoOrganization')
    }
  }
  
  // Check if we're in demo mode
  const { DEMO_USERS } = await import('@/lib/demo-mode')
  let userRole = null
  let staffSubrole = null
  
  if (isDemoMode()) {
    // In demo mode, get role from demo users
    const demoUser = Object.values(DEMO_USERS).find(u => u.id === session.user.id)
    userRole = demoUser?.role || 'STAFF'
    staffSubrole = (demoUser as any)?.staffSubrole || 'ADMIN' // Default to ADMIN for demo
    // console.log('Demo user found:', demoUser, 'staffSubrole:', staffSubrole) // Debug log
  } else {
    userRole = await getUserRoleInOrg(session.user.id, org.id)
    if (!userRole) {
      redirect('/auth/signin?error=NotMember')
    }
    // For now, default to ADMIN for database users
    // TODO: Implement staff subrole storage in database
    staffSubrole = 'ADMIN'
  }
  
  return (
    <Page
      user={session.user}
      org={org}
      userRole={userRole}
      staffSubrole={staffSubrole}
      title={staffSubrole === 'FINANCE_OFFICER' ? "Finance Dashboard" : "Staff Portal"}
      breadcrumbs={[{ label: staffSubrole === 'FINANCE_OFFICER' ? 'Finance Dashboard' : 'Dashboard' }]}
    >
      <StaffLayoutWrapper userRole={userRole} staffSubrole={staffSubrole}>
        {children}
      </StaffLayoutWrapper>
    </Page>
  )
}
