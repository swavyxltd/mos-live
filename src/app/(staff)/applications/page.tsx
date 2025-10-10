import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { ApplicationsPageClient } from '@/components/applications-page-client'

export default async function ApplicationsPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  return <ApplicationsPageClient orgSlug={org.slug} />
}
