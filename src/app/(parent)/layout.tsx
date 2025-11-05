import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveOrg, getUserRoleInOrg, getUserOrgs, setActiveOrgId } from '@/lib/org'
import { Page } from '@/components/shell/page'
import { getPlatformSettings } from '@/lib/platform-settings'

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin?portal=parent')
  }

  // Check maintenance mode - owners can bypass
  if (!session.user.isSuperAdmin) {
    const settings = await getPlatformSettings()
    if (settings?.maintenanceMode) {
      redirect('/maintenance')
    }
  }
  
  let org = await getActiveOrg(session.user.id)
  if (!org) {
    // Try to automatically set the active org from user's organizations
    try {
      const userOrgs = await getUserOrgs(session.user.id)
      
      if (userOrgs && Array.isArray(userOrgs) && userOrgs.length > 0) {
        // Use the first organization
        const selectedOrg = userOrgs[0]
        
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
  // slug is optional - if missing, use org name as fallback
  const orgForPage = org.id && org.name ? {
    id: org.id,
    name: org.name,
    slug: org.slug || org.name.toLowerCase().replace(/\s+/g, '-')
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
