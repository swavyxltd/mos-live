import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default async function StudentsPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let students: any[] = []

  if (isDemoMode()) {
    // Demo data for students
    students = [
      {
        id: 'demo-student-1',
        firstName: 'Ahmed',
        lastName: 'Hassan',
        email: 'ahmed.hassan@example.com',
        phone: '+44 7700 900001',
        dateOfBirth: new Date('2015-03-15'),
        grade: '3',
        parentName: 'Mohammed Hassan',
        parentEmail: 'mohammed.hassan@example.com',
        parentPhone: '+44 7700 900002',
        address: '123 Main Street, Leicester',
        emergencyContact: 'Fatima Hassan (+44 7700 900003)',
        medicalInfo: 'No known allergies',
        enrollmentDate: new Date('2024-09-01'),
        status: 'ACTIVE',
        orgId: org.id,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06')
      },
      {
        id: 'demo-student-2',
        firstName: 'Fatima',
        lastName: 'Ali',
        email: 'fatima.ali@example.com',
        phone: '+44 7700 900004',
        dateOfBirth: new Date('2014-07-22'),
        grade: '4',
        parentName: 'Aisha Ali',
        parentEmail: 'aisha.ali@example.com',
        parentPhone: '+44 7700 900005',
        address: '456 Oak Avenue, Leicester',
        emergencyContact: 'Hassan Ali (+44 7700 900006)',
        medicalInfo: 'Asthma - inhaler required',
        enrollmentDate: new Date('2024-09-01'),
        status: 'ACTIVE',
        orgId: org.id,
        createdAt: new Date('2024-09-01'),
        updatedAt: new Date('2024-12-06')
      },
      {
        id: 'demo-student-3',
        firstName: 'Yusuf',
        lastName: 'Patel',
        email: 'yusuf.patel@example.com',
        phone: '+44 7700 900007',
        dateOfBirth: new Date('2016-11-08'),
        grade: '2',
        parentName: 'Priya Patel',
        parentEmail: 'priya.patel@example.com',
        parentPhone: '+44 7700 900008',
        address: '789 Elm Street, Leicester',
        emergencyContact: 'Raj Patel (+44 7700 900009)',
        medicalInfo: 'No known allergies',
        enrollmentDate: new Date('2024-09-15'),
        status: 'ACTIVE',
        orgId: org.id,
        createdAt: new Date('2024-09-15'),
        updatedAt: new Date('2024-12-06')
      }
    ]
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage student information and enrollments.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Student
        </Button>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Parent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enrollment Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.map((student) => (
                  <tr key={student.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700">
                              {student.firstName.charAt(0)}{student.lastName.charAt(0)}
                            </span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {student.firstName} {student.lastName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {student.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      Grade {student.grade}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.parentName}</div>
                      <div className="text-sm text-gray-500">{student.parentEmail}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                        {student.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {student.enrollmentDate.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
