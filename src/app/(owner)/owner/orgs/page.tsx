'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Page } from '@/components/shell/page'
import { AllOrgsTable } from '@/components/all-orgs-table'
import { Button } from '@/components/ui/button'
import { Modal } from '@/components/ui/modal'
import { AddOrganisationForm } from '@/components/add-organisation-form'
import { isDemoMode } from '@/lib/demo-mode'
import { Plus } from 'lucide-react'

export default function OwnerOrgsPage() {
  const { data: session, status } = useSession()
  const [orgsWithStats, setOrgsWithStats] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return

    if (isDemoMode()) {
      // Demo data for organizations
      const demoOrgs = [
        {
          id: 'demo-org-1',
          name: 'Leicester Islamic Centre',
          slug: 'leicester-islamic-centre',
          timezone: 'Europe/London',
          createdAt: new Date('2024-01-15'),
          updatedAt: new Date('2024-12-06'),
          _count: {
            students: 25,
            classes: 3,
            memberships: 4,
            invoices: 1
          },
          platformBilling: {
            status: 'ACTIVE',
            currentPeriodEnd: new Date('2024-12-31')
          },
          owner: {
            name: 'Ahmed Hassan',
            email: 'owner@demo.com'
          },
          totalRevenue: 5000,
          lastActivity: new Date('2024-12-06')
        },
        {
          id: 'demo-org-2',
          name: 'Manchester Islamic School',
          slug: 'manchester-islamic-school',
          timezone: 'Europe/London',
          createdAt: new Date('2024-02-20'),
          updatedAt: new Date('2024-12-05'),
          _count: {
            students: 15,
            classes: 2,
            memberships: 3,
            invoices: 0
          },
          platformBilling: {
            status: 'ACTIVE',
            currentPeriodEnd: new Date('2024-12-31')
          },
          owner: {
            name: 'Fatima Ali',
            email: 'admin@demo.com'
          },
          totalRevenue: 3000,
          lastActivity: new Date('2024-12-05')
        },
        {
          id: 'demo-org-3',
          name: 'Birmingham Quran Academy',
          slug: 'birmingham-quran-academy',
          timezone: 'Europe/London',
          createdAt: new Date('2024-03-10'),
          updatedAt: new Date('2024-12-04'),
          _count: {
            students: 10,
            classes: 1,
            memberships: 2,
            invoices: 1
          },
          platformBilling: {
            status: 'PAST_DUE',
            currentPeriodEnd: new Date('2024-11-30')
          },
          owner: {
            name: 'Moulana Omar',
            email: 'staff@demo.com'
          },
          totalRevenue: 2000,
          lastActivity: new Date('2024-12-04')
        }
      ]
      setOrgsWithStats(demoOrgs)
      setLoading(false)
    } else {
      // Fetch real data from API
      fetch('/api/orgs')
        .then(res => res.json())
        .then(data => {
          setOrgsWithStats(data)
          setLoading(false)
        })
        .catch(err => {
          console.error('Error fetching organisations:', err)
          setLoading(false)
        })
    }
  }, [status])

  if (status === 'loading' || loading) {
    return <div>Loading...</div>
  }

  if (!session?.user?.id) {
    return <div>Please sign in to view organisations.</div>
  }

  // Demo org data
  const org = {
    id: 'demo-platform',
    name: 'Madrasah OS Platform',
    slug: 'madrasah-os-platform'
  }

  const handleAddOrganisation = () => {
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
  }

  const handleOrganisationCreated = () => {
    setIsModalOpen(false)
    // Refresh the organisations list
    if (isDemoMode()) {
      // In demo mode, we could add the new org to the list
      // For now, just close the modal
    } else {
      // In real mode, refetch the data
      fetch('/api/orgs')
        .then(res => res.json())
        .then(data => setOrgsWithStats(data))
        .catch(err => console.error('Error refreshing organisations:', err))
    }
  }

  return (
    <>
      <Page 
        user={session.user} 
        org={org} 
        userRole="OWNER"
        title="Organisations"
        breadcrumbs={[{ href: '/owner/orgs', label: 'Organisations' }]}
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-[var(--foreground)]">Organisations</h1>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Manage all organisations on your platform.
              </p>
            </div>
            <Button onClick={handleAddOrganisation}>
              <Plus className="h-4 w-4 mr-2" />
              New Organisation
            </Button>
          </div>

          <AllOrgsTable orgs={orgsWithStats} />
        </div>
      </Page>

      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title="Add New Organisation"
      >
        <AddOrganisationForm
          onSuccess={handleOrganisationCreated}
          onCancel={handleModalClose}
        />
      </Modal>
    </>
  )
}
