import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Page } from '@/components/shell/page'

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
    <Page
      user={session.user}
      userRole="OWNER"
      title="Admin Backend"
      breadcrumbs={[{ label: 'Admin' }]}
    >
      <div className="space-y-4 sm:space-y-6 w-full overflow-x-hidden">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] break-words">Admin Backend</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)] break-words">Manage all users and accounts</p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden w-full min-w-0">
          <div className="px-4 sm:px-5 lg:px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg sm:text-xl font-semibold break-words">All Users ({users.length})</h2>
          </div>
          <div className="overflow-x-auto w-full">
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

        <div className="mt-4 sm:mt-6 lg:mt-8 bg-white rounded-lg shadow p-4 sm:p-5 lg:p-6 w-full min-w-0">
          <h2 className="text-lg sm:text-xl font-semibold mb-4 break-words">Quick Actions</h2>
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
    </Page>
  )
}

