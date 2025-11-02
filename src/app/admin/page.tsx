import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function AdminPage() {
  const session = await getServerSession(authOptions)
  
  // Only allow super admins
  if (!session?.user?.id || !session.user.isSuperAdmin) {
    redirect('/auth/signin')
  }

  // Fetch all users
  const users = await prisma.user.findMany({
    include: {
      memberships: {
        include: {
          org: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Backend</h1>
          <p className="text-gray-600 mt-2">Manage all users and accounts</p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold">All Users ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Organizations</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Has Password</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {user.isSuperAdmin ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.memberships.length > 0 ? (
                        <div className="space-y-1">
                          {user.memberships.map((m) => (
                            <div key={m.id} className="flex items-center space-x-2">
                              <span>{m.org.name}</span>
                              <span className="text-xs text-gray-400">({m.role})</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.password ? '✅ Yes' : '❌ No'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <a
              href="/owner/users/create"
              className="block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Create New Owner/Admin Account
            </a>
            <a
              href="/owner/users"
              className="block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Go to Full User Management
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

