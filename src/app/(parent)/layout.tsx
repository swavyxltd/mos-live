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
        // Use the first organization
        const selectedOrg = userOrgs[0]
        
        if (selectedOrg && selectedOrg.org && selectedOrg.org.id) {
          await setActiveOrgId(selectedOrg.org.id)
          org = selectedOrg.org
        }
      }
    } catch (error: any) {
      console.error('[ParentLayout] Error setting active org:', error?.message || error)
    }
  }
  
  if (!org) {
    redirect('/auth/signin?portal=parent&error=NoOrganization')
  }
  
  const userRole = await getUserRoleInOrg(session.user.id, org.id)
  if (userRole !== 'PARENT') {
    redirect('/auth/signin?portal=parent&error=NotParent')
  }
  
  return (
    <Page
      user={session.user}
      org={org}
      userRole="PARENT"
      title="Parent Portal"
      breadcrumbs={[{ label: 'Dashboard' }]}
    >
      {children}
    </Page>
  )
}
