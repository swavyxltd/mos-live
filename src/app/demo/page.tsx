import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isDemoMode } from '@/lib/demo-mode'

export default async function DemoPage() {
  const session = await getServerSession(authOptions)
  const demoMode = isDemoMode()

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Madrasah OS Demo Status</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Demo Mode Status</h2>
            <p className={`text-lg ${demoMode ? 'text-green-600' : 'text-red-600'}`}>
              {demoMode ? '✅ Demo Mode Active' : '❌ Demo Mode Inactive'}
            </p>
            <p className="text-sm text-gray-600 mt-2">
              {demoMode 
                ? 'Using demo authentication without database' 
                : 'Using database authentication'
              }
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Authentication Status</h2>
            {session ? (
              <div>
                <p className="text-green-600 text-lg">✅ Signed In</p>
                <p className="text-sm text-gray-600 mt-2">
                  User: {session.user?.name || session.user?.email}
                </p>
                <p className="text-sm text-gray-600">
                  Super Admin: {session.user?.isSuperAdmin ? 'Yes' : 'No'}
                </p>
              </div>
            ) : (
              <p className="text-red-600 text-lg">❌ Not Signed In</p>
            )}
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Demo Accounts</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border p-4 rounded">
              <h3 className="font-medium">Owner</h3>
              <p className="text-sm text-gray-600">owner@demo.com</p>
              <p className="text-sm text-gray-600">Password: demo123</p>
            </div>
            <div className="border p-4 rounded">
              <h3 className="font-medium">Admin</h3>
              <p className="text-sm text-gray-600">admin@demo.com</p>
              <p className="text-sm text-gray-600">Password: demo123</p>
            </div>
            <div className="border p-4 rounded">
              <h3 className="font-medium">Teacher</h3>
              <p className="text-sm text-gray-600">teacher@demo.com</p>
              <p className="text-sm text-gray-600">Password: demo123</p>
            </div>
            <div className="border p-4 rounded">
              <h3 className="font-medium">Parent</h3>
              <p className="text-sm text-gray-600">parent@demo.com</p>
              <p className="text-sm text-gray-600">Password: demo123</p>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="space-y-2">
            <a href="/?portal=auth" className="block text-blue-600 hover:underline">
              🔐 Auth Portal
            </a>
            <a href="/?portal=app" className="block text-blue-600 hover:underline">
              👨‍💼 Staff Portal
            </a>
            <a href="/?portal=parent" className="block text-blue-600 hover:underline">
              👨‍👩‍👧‍👦 Parent Portal
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
