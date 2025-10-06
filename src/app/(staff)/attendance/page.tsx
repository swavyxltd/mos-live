import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { Button } from '@/components/ui/button'
import { Calendar, Download } from 'lucide-react'

export default async function AttendancePage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  // Check if we're in demo mode
  const { isDemoMode } = await import('@/lib/demo-mode')
  
  let attendanceData: any[] = []

  if (isDemoMode()) {
    // Demo attendance data
    attendanceData = [
      {
        id: 'demo-attendance-1',
        date: new Date('2024-12-06'),
        class: {
          name: 'Quran Recitation - Level 1',
          teacher: 'Omar Khan'
        },
        students: [
          { name: 'Ahmed Hassan', status: 'PRESENT', time: '4:00 PM' },
          { name: 'Fatima Ali', status: 'PRESENT', time: '4:02 PM' },
          { name: 'Yusuf Patel', status: 'LATE', time: '4:15 PM' }
        ],
        totalStudents: 3,
        present: 2,
        absent: 0,
        late: 1
      },
      {
        id: 'demo-attendance-2',
        date: new Date('2024-12-05'),
        class: {
          name: 'Islamic Studies - Level 2',
          teacher: 'Aisha Patel'
        },
        students: [
          { name: 'Mariam Ahmed', status: 'PRESENT', time: '5:00 PM' },
          { name: 'Hassan Khan', status: 'ABSENT', time: null }
        ],
        totalStudents: 2,
        present: 1,
        absent: 1,
        late: 0
      }
    ]
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage student attendance.
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            Mark Attendance
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {attendanceData.map((record) => (
          <div key={record.id} className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {record.class.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {record.date.toLocaleDateString()} • {record.class.teacher}
                  </p>
                </div>
                <div className="flex space-x-4 text-sm">
                  <div className="text-green-600">
                    <span className="font-medium">{record.present}</span> Present
                  </div>
                  <div className="text-red-600">
                    <span className="font-medium">{record.absent}</span> Absent
                  </div>
                  <div className="text-yellow-600">
                    <span className="font-medium">{record.late}</span> Late
                  </div>
                </div>
              </div>
              
              <div className="overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Student
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {record.students.map((student: any, index: number) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {student.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            student.status === 'PRESENT' 
                              ? 'bg-green-100 text-green-800'
                              : student.status === 'ABSENT'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {student.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {student.time || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
