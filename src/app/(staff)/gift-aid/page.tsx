import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { redirect } from 'next/navigation'
import { GiftAidPageClient } from '@/components/gift-aid-page-client'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

export default async function GiftAidPage() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      redirect('/auth/signin')
    }

    const org = await getActiveOrg(session.user.id)
    if (!org) {
      redirect('/auth/signin')
    }

    const userRole = await getUserRoleInOrg(session.user.id, org.id)
    
    // Only allow ADMIN and OWNER
    if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
      redirect('/dashboard')
    }

    return <GiftAidPageClient />
  } catch (error: any) {
    logger.error('Gift Aid page error', error)
    // Return error page instead of crashing
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Error Loading Gift Aid Page</h1>
          <p className="text-muted-foreground">
            {process.env.NODE_ENV === 'development' ? error?.message : 'An error occurred. Please try again.'}
          </p>
        </div>
      </div>
    )
  }
}

