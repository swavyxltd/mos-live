import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { OwnerSidebar } from '@/components/owner-sidebar'
import { canAccessOwnerFeatures } from '@/lib/roles'

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }
  
  if (!canAccessOwnerFeatures('ADMIN', session.user.isSuperAdmin)) {
    redirect('/dashboard')
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <OwnerSidebar user={session.user} />
      <div className="sm:pl-64">
        <main className="py-6">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
