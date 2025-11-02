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
        console.log(`[StaffLayout] Attempting to auto-set org for user: ${session.user.id}`)
        const userOrgs = await getUserOrgs(session.user.id)
        console.log(`[StaffLayout] Found ${userOrgs?.length || 0} organizations for user`)
        
        if (userOrgs && Array.isArray(userOrgs) && userOrgs.length > 0) {
          // Use the first organization (or prioritize admin orgs)
          // userOrgs is an array of UserOrgMembership objects with included org
          const adminOrg = userOrgs.find((uo: any) => uo && uo.role === 'ADMIN')
          const selectedOrg = adminOrg || userOrgs[0]
          
          console.log(`[StaffLayout] Selected org:`, selectedOrg?.org?.id, selectedOrg?.org?.name)
          
          // Check if selectedOrg has the org property
          if (selectedOrg && selectedOrg.org && selectedOrg.org.id) {
            console.log(`[StaffLayout] Setting active org to: ${selectedOrg.org.id}`)
            // Set the cookie for future requests, but use the org directly now
            await setActiveOrgId(selectedOrg.org.id)
            org = selectedOrg.org
            console.log(`[StaffLayout] Org set successfully:`, org.id, org.name)
          } else {
            console.error(`[StaffLayout] Selected org missing required properties:`, selectedOrg)
          }
        } else {
          console.error(`[StaffLayout] No organizations found for user ${session.user.id}`)
        }
      } catch (error: any) {
        console.error('[StaffLayout] Error setting active org:', error?.message || error)
        console.error('[StaffLayout] Error stack:', error?.stack)
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
