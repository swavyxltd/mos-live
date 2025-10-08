import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
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
  
  const org = await getActiveOrg()
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
