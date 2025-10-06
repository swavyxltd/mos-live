import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
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
    <>
      {children}
    </>
  )
}
