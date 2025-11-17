'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, X, Clock } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface MaintenanceNotification {
  hasScheduledMaintenance: boolean
  scheduledAt: string | null
  message: string | null
  hoursUntil: number | null
}

export function MaintenanceNotificationBanner() {
  const [notification, setNotification] = useState<MaintenanceNotification | null>(null)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    fetchMaintenanceNotification()
    
    // Check every minute for updates
    const interval = setInterval(() => {
      fetchMaintenanceNotification()
    }, 60000)
    
    return () => clearInterval(interval)
  }, [])

  const fetchMaintenanceNotification = async () => {
    try {
      const response = await fetch('/api/maintenance/notification')
      if (response.ok) {
        const data = await response.json()
        setNotification(data)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  // Check if banner was dismissed in localStorage
  useEffect(() => {
    if (notification?.scheduledAt) {
      const dismissedKey = `maintenance-dismissed-${notification.scheduledAt}`
      const isDismissed = localStorage.getItem(dismissedKey) === 'true'
      setDismissed(isDismissed)
    }
  }, [notification])

  const handleDismiss = () => {
    if (notification?.scheduledAt) {
      const dismissedKey = `maintenance-dismissed-${notification.scheduledAt}`
      localStorage.setItem(dismissedKey, 'true')
      setDismissed(true)
    }
  }

  if (loading || dismissed || !notification?.hasScheduledMaintenance) {
    return null
  }

  // Only show if within 24 hours
  if (notification.hoursUntil === null || notification.hoursUntil > 24) {
    return null
  }

  const formatTimeRemaining = (hours: number | null) => {
    if (hours === null) return ''
    
    if (hours < 1) {
      const minutes = Math.floor(hours * 60)
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`
    } else if (hours < 24) {
      return `${Math.floor(hours)} hour${Math.floor(hours) !== 1 ? 's' : ''}`
    } else {
      const days = Math.floor(hours / 24)
      return `${days} day${days !== 1 ? 's' : ''}`
    }
  }

  return (
    <Card className="mb-6 border-yellow-200 bg-yellow-50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-3 flex-1">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-900 mb-1">
                Scheduled Maintenance
              </h3>
              <p className="text-sm text-yellow-800 mb-2">
                {notification.hoursUntil !== null && notification.hoursUntil < 24 && (
                  <span className="font-medium">
                    Maintenance will begin in {formatTimeRemaining(notification.hoursUntil)}.
                  </span>
                )}
                {notification.hoursUntil !== null && notification.hoursUntil < 24 && notification.message && ' '}
                {notification.message && (
                  <span>{notification.message}</span>
                )}
              </p>
              {notification.scheduledAt && (
                <div className="flex items-center gap-2 text-xs text-yellow-700 mt-2">
                  <Clock className="h-3 w-3" />
                  <span>
                    Scheduled for: {new Date(notification.scheduledAt).toLocaleString('en-GB', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-yellow-600 hover:text-yellow-800 ml-4 flex-shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

