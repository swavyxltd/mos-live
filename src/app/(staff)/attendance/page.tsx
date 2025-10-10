import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { AttendancePageClient } from '@/components/attendance-page-client'

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
    // Enhanced demo attendance data with weekly attendance and percentages
    attendanceData = [
      {
        id: 'demo-attendance-1',
        name: 'Quran Recitation - Level 1',
        teacher: 'Omar Khan',
        date: new Date('2024-12-06'),
        totalStudents: 3,
        present: 2,
        absent: 0,
        late: 1,
        students: [
          { 
            id: 's1',
            name: 'Ahmed Hassan', 
            status: 'PRESENT', 
            time: '4:00 PM',
            attendancePercentage: 95,
            weeklyAttendance: [
              { day: 'Mon', status: 'PRESENT', time: '4:00 PM' },
              { day: 'Tue', status: 'PRESENT', time: '3:58 PM' },
              { day: 'Wed', status: 'LATE', time: '4:12 PM' },
              { day: 'Thu', status: 'PRESENT', time: '4:01 PM' },
              { day: 'Fri', status: 'PRESENT', time: '3:59 PM' }
            ]
          },
          { 
            id: 's2',
            name: 'Fatima Ali', 
            status: 'PRESENT', 
            time: '4:02 PM',
            attendancePercentage: 100,
            weeklyAttendance: [
              { day: 'Mon', status: 'PRESENT', time: '4:00 PM' },
              { day: 'Tue', status: 'PRESENT', time: '3:57 PM' },
              { day: 'Wed', status: 'PRESENT', time: '4:02 PM' },
              { day: 'Thu', status: 'PRESENT', time: '3:59 PM' },
              { day: 'Fri', status: 'PRESENT', time: '4:01 PM' }
            ]
          },
          { 
            id: 's3',
            name: 'Yusuf Patel', 
            status: 'LATE', 
            time: '4:15 PM',
            attendancePercentage: 80,
            weeklyAttendance: [
              { day: 'Mon', status: 'ABSENT' },
              { day: 'Tue', status: 'PRESENT', time: '4:05 PM' },
              { day: 'Wed', status: 'LATE', time: '4:18 PM' },
              { day: 'Thu', status: 'PRESENT', time: '4:03 PM' },
              { day: 'Fri', status: 'LATE', time: '4:15 PM' }
            ]
          }
        ]
      },
      {
        id: 'demo-attendance-2',
        name: 'Islamic Studies - Level 2',
        teacher: 'Aisha Patel',
        date: new Date('2024-12-05'),
        totalStudents: 2,
        present: 1,
        absent: 1,
        late: 0,
        students: [
          { 
            id: 's4',
            name: 'Mariam Ahmed', 
            status: 'PRESENT', 
            time: '5:00 PM',
            attendancePercentage: 90,
            weeklyAttendance: [
              { day: 'Mon', status: 'PRESENT', time: '5:00 PM' },
              { day: 'Tue', status: 'ABSENT' },
              { day: 'Wed', status: 'PRESENT', time: '5:02 PM' },
              { day: 'Thu', status: 'PRESENT', time: '4:58 PM' },
              { day: 'Fri', status: 'PRESENT', time: '5:01 PM' }
            ]
          },
          { 
            id: 's5',
            name: 'Hassan Khan', 
            status: 'ABSENT', 
            time: null,
            attendancePercentage: 70,
            weeklyAttendance: [
              { day: 'Mon', status: 'PRESENT', time: '5:05 PM' },
              { day: 'Tue', status: 'ABSENT' },
              { day: 'Wed', status: 'ABSENT' },
              { day: 'Thu', status: 'PRESENT', time: '5:02 PM' },
              { day: 'Fri', status: 'ABSENT' }
            ]
          }
        ]
      }
    ]
  }

  return <AttendancePageClient attendanceData={attendanceData} />
}
