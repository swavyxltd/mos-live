'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Modal } from '@/components/ui/modal'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, MapPin, Users, Edit, Trash2, X } from 'lucide-react'

interface CalendarEvent {
  id: string
  title: string
  date: Date
  startTime?: string
  endTime?: string
  type: 'CLASS' | 'HOLIDAY' | 'EXAM' | 'MEETING' | 'EVENT'
  isHoliday?: boolean
  room?: string
  teacher?: string
  students?: string[]
  description?: string
  location?: string
  allDay?: boolean
}

interface EventDetailModalProps {
  event: CalendarEvent | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEventUpdated?: (event: CalendarEvent) => void
  onEventDeleted?: (eventId: string) => void
}

export function EventDetailModal({ 
  event, 
  open, 
  onOpenChange, 
  onEventUpdated, 
  onEventDeleted 
}: EventDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'CLASS',
    date: '',
    startTime: '',
    endTime: '',
    location: '',
    teacher: '',
    allDay: false
  })

  const eventTypes = [
    { value: 'CLASS', label: 'Class' },
    { value: 'EXAM', label: 'Exam' },
    { value: 'HOLIDAY', label: 'Holiday' },
    { value: 'MEETING', label: 'Meeting' },
    { value: 'EVENT', label: 'Event' }
  ]

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'CLASS':
        return 'bg-blue-100 text-blue-800'
      case 'EXAM':
        return 'bg-yellow-100 text-yellow-800'
      case 'HOLIDAY':
        return 'bg-red-100 text-red-800'
      case 'MEETING':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleEdit = () => {
    if (event) {
      setFormData({
        title: event.title,
        description: event.description || '',
        type: event.type,
        date: event.date.toISOString().split('T')[0],
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        location: event.location || '',
        teacher: event.teacher || '',
        allDay: event.allDay || false
      })
      setIsEditing(true)
    }
  }

  const handleSave = async () => {
    if (!event) return

    setLoading(true)
    try {
      const { isDemoMode } = await import('@/lib/demo-mode')
      
      if (isDemoMode()) {
        const updatedEvent = {
          ...event,
          ...formData,
          date: new Date(formData.date + 'T' + formData.startTime)
        }
        onEventUpdated?.(updatedEvent)
        setIsEditing(false)
      } else {
        const response = await fetch(`/api/calendar/${event.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        })

        if (response.ok) {
          const updatedEvent = await response.json()
          onEventUpdated?.(updatedEvent)
          setIsEditing(false)
        }
      }
    } catch (error) {
      console.error('Error updating event:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event) return

    if (confirm('Are you sure you want to delete this event?')) {
      setLoading(true)
      try {
        const { isDemoMode } = await import('@/lib/demo-mode')
        
        if (isDemoMode()) {
          onEventDeleted?.(event.id)
          onOpenChange(false)
        } else {
          const response = await fetch(`/api/calendar/${event.id}`, {
            method: 'DELETE',
          })

          if (response.ok) {
            onEventDeleted?.(event.id)
            onOpenChange(false)
          }
        }
      } catch (error) {
        console.error('Error deleting event:', error)
      } finally {
        setLoading(false)
      }
    }
  }

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  if (!event) return null

  return (
    <Modal isOpen={open} onClose={() => onOpenChange(false)} title={isEditing ? 'Edit Event' : 'Event Details'}>
      <div className="flex items-center justify-end space-x-2 mb-4">
        {!isEditing && (
          <>
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} disabled={loading}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>

        {isEditing ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Event Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="Enter event title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="type">Event Type</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange('type', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {eventTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter event description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={formData.allDay}
                    onChange={(e) => handleInputChange('allDay', e.target.checked)}
                    className="rounded"
                  />
                  <span>All Day Event</span>
                </Label>
              </div>
            </div>

            {!formData.allDay && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => handleInputChange('startTime', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => handleInputChange('endTime', e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="Enter location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="teacher">Teacher/Organizer</Label>
                <Input
                  id="teacher"
                  value={formData.teacher}
                  onChange={(e) => handleInputChange('teacher', e.target.value)}
                  placeholder="Enter teacher name"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">{event.title}</h3>
                <Badge className={`mt-2 ${getEventTypeColor(event.type)}`}>
                  {event.type}
                </Badge>
              </div>
            </div>

            {event.description && (
              <div>
                <h4 className="font-medium text-[var(--foreground)] mb-2">Description</h4>
                <p className="text-sm text-[var(--muted-foreground)]">{event.description}</p>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Calendar className="h-4 w-4 text-[var(--muted-foreground)]" />
                <span className="text-sm text-[var(--foreground)]">
                  {event.date.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>

              {event.startTime && (
                <div className="flex items-center space-x-3">
                  <Clock className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <span className="text-sm text-[var(--foreground)]">
                    {event.startTime} {event.endTime && `- ${event.endTime}`}
                  </span>
                </div>
              )}

              {event.location && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <span className="text-sm text-[var(--foreground)]">{event.location}</span>
                </div>
              )}

              {event.teacher && (
                <div className="flex items-center space-x-3">
                  <Users className="h-4 w-4 text-[var(--muted-foreground)]" />
                  <span className="text-sm text-[var(--foreground)]">{event.teacher}</span>
                </div>
              )}
            </div>
          </div>
        )}
    </Modal>
  )
}
