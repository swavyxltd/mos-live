'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useState } from 'react'
import { ToastContainer } from '@/components/ui/toast'

interface Org {
  id: string
  name: string
  slug: string
}

interface Toast {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
}

export default function CreateUserPage() {
  const router = useRouter()
  const [toasts, setToasts] = useState<Toast[]>([])
  
  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...toast, id }])
  }

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const toast = ({ title, description, variant }: { title: string; description?: string; variant?: 'destructive' }) => {
    addToast({
      type: variant === 'destructive' ? 'error' : 'success',
      title,
      message: description || '',
    })
  }
  const [loading, setLoading] = useState(false)
  const [orgs, setOrgs] = useState<Org[]>([])
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    password: '',
    phone: '',
    isSuperAdmin: false,
    orgId: '',
    role: 'ADMIN' as 'ADMIN' | 'STAFF' | 'PARENT'
  })

  useEffect(() => {
    // Fetch organizations
    fetch('/api/orgs')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setOrgs(data)
        }
      })
      .catch(err => {
        console.error('Error fetching organizations:', err)
      })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create user')
      }

      toast({
        title: 'Success',
        description: `User ${formData.email} created successfully`
      })

      router.push('/owner/users')
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-2xl">
      <ToastContainer toasts={toasts} onClose={removeToast} />
      <Card>
        <CardHeader>
          <CardTitle>Create User Account</CardTitle>
          <CardDescription>
            Easily create owner, admin, staff, or parent accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="User Name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Set a secure password"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+44 7700 900000"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Account Type *</Label>
              <Select
                value={formData.role}
                onValueChange={(value: 'ADMIN' | 'STAFF' | 'PARENT') => {
                  setFormData({ ...formData, role: value, isSuperAdmin: false })
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin (Organization Admin)</SelectItem>
                  <SelectItem value="STAFF">Staff (Teacher/Staff)</SelectItem>
                  <SelectItem value="PARENT">Parent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {!formData.isSuperAdmin && (
              <div className="space-y-2">
                <Label htmlFor="orgId">Organization *</Label>
                <Select
                  value={formData.orgId}
                  onValueChange={(value) => {
                    setFormData({ ...formData, orgId: value })
                  }}
                  required={!formData.isSuperAdmin}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {orgs.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isSuperAdmin"
                checked={formData.isSuperAdmin}
                onChange={(e) => {
                  const checked = e.target.checked
                  setFormData({ 
                    ...formData, 
                    isSuperAdmin: checked,
                    orgId: checked ? '' : formData.orgId // Clear orgId if super admin
                  })
                }}
                className="rounded"
              />
              <Label htmlFor="isSuperAdmin">Make this user a Platform Owner (Super Admin)</Label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={loading}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

