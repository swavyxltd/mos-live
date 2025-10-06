import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

export default async function Home() {
  const headersList = await headers()
  const portal = headersList.get('x-portal') || 'app'
  
  // Redirect based on portal
  if (portal === 'parent') {
    redirect('/parent/dashboard')
  } else if (portal === 'auth') {
    redirect('/auth/signin')
  } else {
    redirect('/dashboard')
  }
}