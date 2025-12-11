import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { canAccessOwnerFeatures } from '@/lib/roles'
import { getActiveOrg } from '@/lib/org'
import { Page } from '@/components/shell/page'
import { OwnerLayoutWrapper } from '@/components/owner-layout-wrapper'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }
  
  // STRICT: Only allow super admins (owners) to access owner portal
  if (!session.user.isSuperAdmin) {
    // Get role hints from token to determine correct redirect
    const roleHints = (session.user as any)?.roleHints as {
      isParent?: boolean
      orgAdminOf?: string[]
      orgStaffOf?: string[]
    } | undefined
    
    // Redirect based on their actual role
    if (roleHints?.isParent) {
      redirect('/parent/dashboard')
    } else if (roleHints?.orgAdminOf?.length || roleHints?.orgStaffOf?.length) {
      redirect('/dashboard')
    } else {
      redirect('/auth/signin')
    }
  }
  
  // Owners don't need an org - they can access the portal to create/manage organisations
  // org is optional for owners - pass userId to avoid any issues
  const org = await getActiveOrg(session.user.id)
  
  return (
    <Page
      user={session.user}
      org={org || undefined}
      userRole="OWNER"
      title="Owner Portal"
      breadcrumbs={[{ label: 'Overview' }]}
    >
      <OwnerLayoutWrapper userRole="OWNER">
        {children}
      </OwnerLayoutWrapper>
    </Page>
  )
}
