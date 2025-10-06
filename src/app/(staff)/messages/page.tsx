import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { Button } from '@/components/ui/button'
import { Plus, Send } from 'lucide-react'

export default async function MessagesPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
          <p className="mt-1 text-sm text-gray-500">
            Send announcements and communicate with parents.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Messages</h3>
            <div className="space-y-4">
              <div className="border-l-4 border-blue-400 pl-4">
                <div className="text-sm font-medium text-gray-900">Holiday Announcement</div>
                <div className="text-sm text-gray-500">Sent to all parents • 2 days ago</div>
                <div className="text-sm text-gray-600 mt-1">
                  School will be closed for winter break from Dec 23 - Jan 2
                </div>
              </div>
              <div className="border-l-4 border-green-400 pl-4">
                <div className="text-sm font-medium text-gray-900">Exam Schedule</div>
                <div className="text-sm text-gray-500">Sent to Grade 4-6 parents • 1 week ago</div>
                <div className="text-sm text-gray-600 mt-1">
                  End of term exams will be held next week
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Send to All Parents
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Send to Specific Class
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Send to Individual Parent
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
