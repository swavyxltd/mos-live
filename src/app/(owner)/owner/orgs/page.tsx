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
      setLoading(true)
      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`/api/owner/orgs/stats?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      if (response.ok) {
        const data = await response.json()
        if (Array.isArray(data)) {
          setOrgsWithStats(data)
        } else {
        }
      } else {
        const errorData = await response.json().catch(() => null)
      }
    } catch (err) {
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
    setLoading(true)
    try {
      await fetchOrgs()
    } catch (err) {
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

        <AllOrgsTable orgs={filteredOrgs} onRefresh={fetchOrgs} />
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
