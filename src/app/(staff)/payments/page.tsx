import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { Button } from '@/components/ui/button'
import { Plus, Download, Eye, CreditCard } from 'lucide-react'
import { InvoicesPageClient } from '@/components/invoices-page-client'

export default async function InvoicesPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  return <InvoicesPageClient />
}
