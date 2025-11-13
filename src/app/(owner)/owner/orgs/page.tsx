'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { AllOrgsTable } from '@/components/all-orgs-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Modal } from '@/components/ui/modal'
import { AddOrganisationForm } from '@/components/add-organisation-form'
import { Plus, Search } from 'lucide-react'

export default function OwnerOrgsPage() {
  const { data: session, status } = useSession()
  const [orgsWithStats, setOrgsWithStats] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchOrgs = async () => {
    try {
      console.log('📥 Fetching organisations from API...')
      const response = await fetch('/api/owner/orgs/stats')
      if (response.ok) {
        const data = await response.json()
        console.log('📦 Received organisations data:', data.length, 'orgs')
        if (Array.isArray(data)) {
          setOrgsWithStats(data)
          console.log('✅ Updated organisations state, new count:', data.length)
        }
      } else {
        console.error('❌ API response not OK:', response.status, response.statusText)
        const errorData = await response.json().catch(() => null)
        console.error('Error details:', errorData)
      }
    } catch (err) {
      console.error('❌ Error fetching organisations:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'loading') return
    fetchOrgs()
  }, [status])

  if (status === 'loading' || loading) {
    return <div>Loading...</div>
  }

  if (!session?.user?.id) {
    return <div>Please sign in to view organisations.</div>
  }


  const handleAddOrganisation = () => {
    setIsModalOpen(true)
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
  }

  const handleOrganisationCreated = async () => {
    setIsModalOpen(false)
    // Refresh the organisations list
    console.log('🔄 Refreshing organisations list...')
    setLoading(true)
    try {
      await fetchOrgs()
      console.log('✅ Organisations list refreshed, count:', orgsWithStats.length)
    } catch (err) {
      console.error('❌ Error refreshing organisations:', err)
    } finally {
      setLoading(false)
    }
  }

  // Filter organizations based on search term
  const filteredOrgs = orgsWithStats.filter(org => {
    if (!searchTerm) return true
    const searchLower = searchTerm.toLowerCase()
    return (
      org.name.toLowerCase().includes(searchLower) ||
      org.city?.toLowerCase().includes(searchLower) ||
      org.slug.toLowerCase().includes(searchLower)
    )
  })

  return (
    <>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Organisations</h1>
            <p className="mt-1 text-sm text-[var(--muted-foreground)]">
              Manage all organisations on your platform.
            </p>
          </div>
          <Button onClick={handleAddOrganisation}>
            <Plus className="h-4 w-4 mr-2" />
            New Organisation
          </Button>
        </div>

        {/* Search Bar */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
            <Input
              placeholder="Search organizations by name or city..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {searchTerm && (
            <div className="text-sm text-gray-500">
              {filteredOrgs.length} of {orgsWithStats.length} organizations
            </div>
          )}
        </div>

        <AllOrgsTable orgs={filteredOrgs} />
      </div>

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
