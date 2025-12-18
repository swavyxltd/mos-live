import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions, getPostLoginRedirect } from '@/lib/auth'

export default async function Home() {
  const session = await getServerSession(authOptions)
  
  // If not authenticated, redirect to sign in
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }
  
  // Get role hints from session to determine correct redirect
  const roleHints = (session.user as any)?.roleHints as {
    isOwner?: boolean
    orgAdminOf?: string[]
    orgStaffOf?: string[]
    isParent?: boolean
  } | undefined
  
  // Use getPostLoginRedirect to ensure parents always go to /parent/dashboard
  if (roleHints) {
    const redirectUrl = getPostLoginRedirect({
      isOwner: roleHints.isOwner || false,
      orgAdminOf: roleHints.orgAdminOf || [],
      orgStaffOf: roleHints.orgStaffOf || [],
      isParent: roleHints.isParent || false
    })
    redirect(redirectUrl)
  }
  
  // Fallback if roleHints are missing
  redirect('/auth/signin')
}