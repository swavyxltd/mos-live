import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveOrg, getUserRoleInOrg, getUserOrgs, setActiveOrgId } from '@/lib/org'
import { Page } from '@/components/shell/page'

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin?portal=parent')
  }
  
  let org = await getActiveOrg(session.user.id)
  if (!org) {
    // Try to automatically set the active org from user's organizations
    try {
      const userOrgs = await getUserOrgs(session.user.id)
      
      if (userOrgs && Array.isArray(userOrgs) && userOrgs.length > 0) {
        // Filter out deactivated organizations (safely handle null/undefined status)
        const activeOrgs = userOrgs.filter((uo: any) => 
          uo && uo.org && uo.org.status && uo.org.status !== 'DEACTIVATED'
        )
        
        if (activeOrgs.length === 0) {
          redirect('/auth/account-deactivated')
        }
        
        // Use the first organization
        const selectedOrg = activeOrgs[0]
        
        if (selectedOrg && selectedOrg.org && selectedOrg.org.id) {
          await setActiveOrgId(selectedOrg.org.id)
          // Re-fetch org to ensure we have all fields
          org = await getActiveOrg(session.user.id)
        }
      }
    } catch (error: any) {
      console.error('[ParentLayout] Error setting active org:', error?.message || error)
    }
  }
  
  // Ensure org is not null and has required fields before proceeding
  if (!org || !org.id || !org.name) {
    redirect('/auth/signin?portal=parent&error=NoOrganization')
  }

  // Check if organization is deactivated (handle null/undefined status)
  if (org.status && org.status === 'DEACTIVATED') {
    redirect('/auth/account-deactivated')
  }
  
  let userRole = null
  try {
    userRole = await getUserRoleInOrg(session.user.id, org.id)
  } catch (error: any) {
    console.error('[ParentLayout] Error getting user role:', error?.message || error)
    redirect('/auth/signin?portal=parent&error=NotParent')
  }
  
  if (userRole !== 'PARENT') {
    redirect('/auth/signin?portal=parent&error=NotParent')
  }
  
  // Ensure org has all required fields for Page component
  const orgForPage = org.id && org.name && org.slug ? {
    id: org.id,
    name: org.name,
    slug: org.slug
  } : undefined
  
  return (
    <Page
      user={session.user}
      org={orgForPage}
      userRole="PARENT"
      title="Parent Portal"
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      {children}
    </Page>
  )
}
