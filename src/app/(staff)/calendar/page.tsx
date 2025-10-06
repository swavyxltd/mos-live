import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { Button } from '@/components/ui/button'
import { Plus, Download } from 'lucide-react'

export default async function CalendarPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let events: any[] = []

  if (isDemoMode()) {
    // Demo calendar events
    events = [
      {
        id: 'demo-event-1',
        title: 'Quran Recitation - Level 1',
        type: 'CLASS',
        startTime: new Date('2024-12-09T16:00:00'),
        endTime: new Date('2024-12-09T17:00:00'),
        location: 'Room A',
        teacher: 'Omar Khan',
        description: 'Regular class session'
      },
      {
        id: 'demo-event-2',
        title: 'Islamic Studies - Level 2',
        type: 'CLASS',
        startTime: new Date('2024-12-10T17:00:00'),
        endTime: new Date('2024-12-10T18:00:00'),
        location: 'Room B',
        teacher: 'Aisha Patel',
        description: 'Regular class session'
      },
      {
        id: 'demo-event-3',
        title: 'End of Term Exams',
        type: 'EXAM',
        startTime: new Date('2024-12-16T09:00:00'),
        endTime: new Date('2024-12-20T15:00:00'),
        location: 'All Rooms',
        teacher: 'All Teachers',
        description: 'End of term examinations for all students'
      },
      {
        id: 'demo-event-4',
        title: 'Winter Break',
        type: 'HOLIDAY',
        startTime: new Date('2024-12-23T00:00:00'),
        endTime: new Date('2025-01-02T23:59:59'),
        location: 'School Closed',
        teacher: 'N/A',
        description: 'School closed for winter break'
      }
    ]
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage school events, classes, and holidays.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Event
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download ICS
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Events */}
        <div className="lg:col-span-2 bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Upcoming Events</h3>
            <div className="space-y-4">
              {events.slice(0, 4).map((event) => (
                <div key={event.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          event.type === 'CLASS' 
                            ? 'bg-blue-100 text-blue-800'
                            : event.type === 'EXAM'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {event.type}
                        </span>
                        <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{event.description}</p>
                      <div className="text-sm text-gray-500 mt-2">
                        <div>📅 {event.startTime.toLocaleDateString()} at {event.startTime.toLocaleTimeString()}</div>
                        <div>📍 {event.location}</div>
                        <div>👨‍🏫 {event.teacher}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Calendar Legend */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Legend</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  CLASS
                </span>
                <span className="text-sm text-gray-600">Regular Classes</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                  EXAM
                </span>
                <span className="text-sm text-gray-600">Examinations</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                  HOLIDAY
                </span>
                <span className="text-sm text-gray-600">Holidays & Breaks</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
