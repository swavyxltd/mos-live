'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  ArrowLeft,
  Save,
  Target,
} from 'lucide-react'
import { toast } from 'sonner'

export default function NewLeadPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isSaving, setIsSaving] = useState(false)

  const [formData, setFormData] = useState({
    orgName: '',
    city: '',
    country: 'UK',
    estimatedStudents: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    source: '',
    status: 'NEW',
    nextContactAt: '',
    notes: '',
    assignedToUserId: '',
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session?.user?.id || !session.user.isSuperAdmin) {
      router.push('/auth/signin')
      return
    }
  }, [session, status, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.orgName.trim()) {
      toast.error('Madrasah name is required')
      return
    }

    setIsSaving(true)
    try {
      const res = await fetch('/api/owner/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          estimatedStudents: formData.estimatedStudents ? parseInt(formData.estimatedStudents) : null,
          nextContactAt: formData.nextContactAt || null,
        }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to create lead')
      }
      const data = await res.json()
      toast.success('Lead created successfully')
      router.push(`/owner/leads/${data.lead.id}`)
    } catch (error: any) {
      console.error('Error creating lead:', error)
      toast.error(error.message || 'Failed to create lead')
    } finally {
      setIsSaving(false)
    }
  }

  if (status === 'loading') {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-start w-full min-w-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/owner/leads')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-[var(--foreground)] break-words">
              Add New Lead
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-[var(--muted-foreground)] break-words">
              Create a new madrasah lead
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <Card className="w-full min-w-0">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg break-words">Lead Information</CardTitle>
          <CardDescription className="text-xs sm:text-sm break-words">
            Fill in the details below to create a new lead
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="orgName">
                  Madrasah Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="orgName"
                  value={formData.orgName}
                  onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                  className="mt-1"
                  required
                />
              </div>
              <div>
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="estimatedStudents">Estimated Students</Label>
                <Input
                  id="estimatedStudents"
                  type="number"
                  value={formData.estimatedStudents}
                  onChange={(e) => setFormData({ ...formData, estimatedStudents: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="status">Initial Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                    <SelectItem value="FOLLOW_UP">Follow Up</SelectItem>
                    <SelectItem value="DEMO_BOOKED">Demo Booked</SelectItem>
                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="mt-1"
                  placeholder="e.g. cold call, referral"
                />
              </div>
              <div>
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contactEmail">Contact Email</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contactPhone">Contact Phone</Label>
                <Input
                  id="contactPhone"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="nextContactAt">Next Follow-up Date</Label>
                <Input
                  id="nextContactAt"
                  type="date"
                  value={formData.nextContactAt}
                  onChange={(e) => setFormData({ ...formData, nextContactAt: e.target.value })}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="mt-1"
                  rows={4}
                  placeholder="Any additional notes about this lead..."
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/owner/leads')}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Creating...' : 'Create Lead'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

