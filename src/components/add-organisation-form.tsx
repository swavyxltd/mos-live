'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AddOrganisationFormProps {
  onSuccess: () => void
  onCancel: () => void
}

export function AddOrganisationForm({ onSuccess, onCancel }: AddOrganisationFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    timezone: 'Europe/London',
    description: '',
    address: '',
    addressLine1: '',
    postcode: '',
    city: '',
    phone: '',
    email: '',
    website: '',
    adminEmail: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    // Validate required fields
    if (!formData.name || !formData.adminEmail) {
      setError('Please fill in all required fields (Name and Admin Email)')
      setIsLoading(false)
      return
    }
    
    // Auto-generate slug if not provided
    if (!formData.slug) {
      const nameSlug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()
      
      const citySlug = formData.city
        ? formData.city
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim()
        : ''
      
      formData.slug = citySlug 
        ? `${nameSlug}-${citySlug}`
        : nameSlug
    }

    try {
      console.log('📤 Creating organisation:', { name: formData.name, slug: formData.slug, adminEmail: formData.adminEmail })
      
      // Real API call - always make it
      const response = await fetch('/api/orgs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      console.log('📥 Response status:', response.status, response.statusText)

      let data
      try {
        data = await response.json()
      } catch (jsonError) {
        console.error('❌ Failed to parse JSON response:', jsonError)
        const text = await response.text()
        console.error('Response text:', text)
        throw new Error('Invalid response from server')
      }

      if (!response.ok) {
        console.error('❌ API error response:', data)
        throw new Error(data.error || data.message || `Failed to create organisation (${response.status})`)
      }

      console.log('✅ Organisation created successfully:', data)
      
      // Reset form
      setFormData({
        name: '',
        slug: '',
        timezone: 'Europe/London',
        description: '',
        address: '',
        phone: '',
        email: '',
        website: '',
        adminEmail: ''
      })
      
      // Call success callback
      onSuccess()
    } catch (err) {
      console.error('❌ Error creating organisation:', err)
      const errorMessage = err instanceof Error ? err.message : 'An error occurred while creating the organisation'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      
      // Auto-generate slug from name and city
      if (field === 'name' || field === 'city') {
        const nameSlug = updated.name
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()
        
        const citySlug = updated.city
          ? updated.city
              .toLowerCase()
              .replace(/[^a-z0-9\s-]/g, '')
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .trim()
          : ''
        
        updated.slug = citySlug 
          ? `${nameSlug}-${citySlug}`
          : nameSlug
      }
      
      return updated
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--destructive-background)] text-[var(--destructive-foreground)] text-sm">
          {error}
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="name">Organisation Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          placeholder="e.g., Manchester Islamic School"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="slug">URL Slug *</Label>
        <Input
          id="slug"
          value={formData.slug}
          onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
          placeholder="e.g., manchester-islamic-school"
          required
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          This will be used in the organisation's URL
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="timezone">Timezone</Label>
        <Select value={formData.timezone} onValueChange={(value) => setFormData(prev => ({ ...prev, timezone: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
            <SelectItem value="Europe/Dublin">Europe/Dublin (GMT)</SelectItem>
            <SelectItem value="Europe/Paris">Europe/Paris (CET)</SelectItem>
            <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
            <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
            <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
            <SelectItem value="Asia/Karachi">Asia/Karachi (PKT)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Brief description of the organisation..."
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="addressLine1">Address Line 1</Label>
        <Input
          id="addressLine1"
          value={formData.addressLine1}
          onChange={(e) => handleInputChange('addressLine1', e.target.value)}
          placeholder="First line of address..."
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postcode">Postcode</Label>
          <Input
            id="postcode"
            value={formData.postcode}
            onChange={(e) => handleInputChange('postcode', e.target.value.toUpperCase())}
            placeholder="SW1A 1AA"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input
            id="city"
            value={formData.city}
            onChange={(e) => handleInputChange('city', e.target.value)}
            placeholder="London"
            required
          />
          <p className="text-xs text-gray-500">Required for slug generation</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Full Address (Legacy - Optional)</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
          placeholder="Full address (optional, for backward compatibility)..."
          rows={2}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="adminEmail">Admin Email *</Label>
        <Input
          id="adminEmail"
          type="email"
          value={formData.adminEmail}
          onChange={(e) => setFormData(prev => ({ ...prev, adminEmail: e.target.value }))}
          placeholder="admin@organisation.org"
          required
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          An invitation email will be sent to this address to set up the organization
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
            placeholder="+44 161 123 4567"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Organization Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="info@organisation.org"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          value={formData.website}
          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
          placeholder="https://www.organisation.org"
        />
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Creating...' : 'Create Organisation'}
        </Button>
      </div>
    </form>
  )
}
