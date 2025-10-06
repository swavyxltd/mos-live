import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function SupportPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Support</h1>
          <p className="mt-1 text-sm text-gray-500">
            Get help and support for your organization.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Ticket
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Support Resources */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Support Resources</h3>
            <div className="space-y-4">
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900">Documentation</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Comprehensive guides and tutorials for using Madrasah OS
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  View Docs
                </Button>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900">Video Tutorials</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Step-by-step video guides for common tasks
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Watch Videos
                </Button>
              </div>
              <div className="border rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900">FAQ</h4>
                <p className="text-sm text-gray-500 mt-1">
                  Frequently asked questions and answers
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  Browse FAQ
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Contact Support */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Support</h3>
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-900">Email Support</h4>
                <p className="text-sm text-gray-500">support@madrasah.io</p>
                <p className="text-xs text-gray-400 mt-1">Response time: 24 hours</p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Live Chat</h4>
                <p className="text-sm text-gray-500">Available 9 AM - 5 PM GMT</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Start Chat
                </Button>
              </div>
              <div>
                <h4 className="text-sm font-medium text-gray-900">Phone Support</h4>
                <p className="text-sm text-gray-500">+44 20 7946 0958</p>
                <p className="text-xs text-gray-400 mt-1">Mon-Fri 9 AM - 5 PM GMT</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
