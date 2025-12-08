'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { X, Save, User, Mail, Phone, Loader2, MapPin, CreditCard } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  phone?: string | null
  title?: string | null
  address?: string | null
  city?: string | null
  postcode?: string | null
  giftAidStatus?: string | null
  role: string | null
  orgName?: string | null
}

interface EditUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: () => void
  userId: string | null
}

export function EditUserModal({ isOpen, onClose, onSave, userId }: EditUserModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    title: '',
    address: '',
    city: '',
    postcode: '',
    giftAidStatus: ''
  })
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen && userId) {
      loadUser()
    } else {
      setFormData({ 
        name: '', 
        email: '', 
        phone: '', 
        title: '', 
        address: '', 
        city: '', 
        postcode: '', 
        giftAidStatus: '' 
      })
    }
  }, [isOpen, userId])

  const loadUser = async () => {
    if (!userId) return
    
    setLoading(true)
    try {
      const res = await fetch(`/api/owner/users/${userId}`)
      if (!res.ok) {
        throw new Error('Failed to load user')
      }
      const data = await res.json()
      setFormData({
        name: data.name || '',
        email: data.email || '',
        phone: data.phone || '',
        title: data.title || '',
        address: data.address || '',
        city: data.city || '',
        postcode: data.postcode || '',
        giftAidStatus: data.giftAidStatus || ''
      })
    } catch (error) {
      toast.error('Failed to load user')
      console.error('Error loading user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!userId) return

    // Validation
    if (!formData.name.trim()) {
      toast.error('Name is required')
      return
    }
    if (!formData.email.trim()) {
      toast.error('Email is required')
      return
    }

    setSaving(true)
    try {
      const res = await fetch(`/api/owner/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to update user')
      }

      toast.success('User updated successfully')
      onSave()
      onClose()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
      console.error('Error updating user:', error)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Edit User"
    >
      {loading ? (
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-sm text-gray-500">Loading user details...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  const value = e.target.value
                  if (value.length > 0) {
                    setFormData({ ...formData, name: value.charAt(0).toUpperCase() + value.slice(1) })
                  } else {
                    setFormData({ ...formData, name: value })
                  }
                }}
                className="pl-10"
                placeholder="Enter user name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email *</Label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value.toLowerCase() })}
                className="pl-10"
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="phone">Phone</Label>
            <div className="relative mt-1">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="pl-10"
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="title">Title</Label>
            <div className="relative mt-1">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="pl-10"
                placeholder="e.g., Mr, Mrs, Dr"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <div className="relative mt-1">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => {
                  const value = e.target.value
                  // Capitalize first letter of each word for address
                  const capitalized = value.split(' ').map(word => {
                    if (word.length === 0) return word
                    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                  }).join(' ')
                  setFormData({ ...formData, address: capitalized })
                }}
                className="pl-10"
                placeholder="Enter street address"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => {
                    const value = e.target.value
                    // Capitalize first letter of each word for city
                    const capitalized = value.split(' ').map(word => {
                      if (word.length === 0) return word
                      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                    }).join(' ')
                    setFormData({ ...formData, city: capitalized })
                  }}
                  className="pl-10"
                  placeholder="Enter city"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="postcode">Postcode</Label>
              <div className="relative mt-1">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="postcode"
                  value={formData.postcode}
                  onChange={(e) => setFormData({ ...formData, postcode: e.target.value.toUpperCase() })}
                  className="pl-10"
                  placeholder="Enter postcode"
                />
              </div>
            </div>
          </div>

          <div>
            <Label htmlFor="giftAidStatus">Gift Aid Status</Label>
            <div className="relative mt-1">
              <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="giftAidStatus"
                value={formData.giftAidStatus}
                onChange={(e) => setFormData({ ...formData, giftAidStatus: e.target.value })}
                className="pl-10"
                placeholder="e.g., DECLARED, NOT_DECLARED"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

