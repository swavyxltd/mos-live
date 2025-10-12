import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { ParentAttendancePageClient } from '@/components/parent-attendance-page-client'
import { isDemoMode } from '@/lib/demo-mode'

export default async function ParentAttendancePage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    return <div>Loading...</div>
  }

  let attendanceData: any[] = []

  if (isDemoMode()) {
    // Demo attendance data for parent's children
    attendanceData = [
      {
        id: 'child-1',
        name: 'Ahmed Hassan',
        class: 'Quran Recitation - Level 1',
        teacher: 'Moulana Omar',
        overallAttendance: 85,
        weeklyAttendance: [
          { day: 'Mon', date: '2024-12-02', status: 'PRESENT', time: '4:00 PM' },
          { day: 'Tue', date: '2024-12-03', status: 'LATE', time: '4:15 PM' },
          { day: 'Wed', date: '2024-12-04', status: 'PRESENT', time: '4:00 PM' },
          { day: 'Thu', date: '2024-12-05', status: 'ABSENT', time: undefined },
          { day: 'Fri', date: '2024-12-06', status: 'PRESENT', time: '4:00 PM' },
        ],
        monthlyAttendance: [
          { week: 'Week 1', present: 4, absent: 1, late: 0 },
          { week: 'Week 2', present: 3, absent: 1, late: 1 },
          { week: 'Week 3', present: 5, absent: 0, late: 0 },
          { week: 'Week 4', present: 4, absent: 0, late: 1 },
        ],
        yearlyAttendance: [
          { month: 'Jan', present: 18, absent: 2, late: 1 },
          { month: 'Feb', present: 16, absent: 4, late: 0 },
          { month: 'Mar', present: 20, absent: 1, late: 0 },
          { month: 'Apr', present: 19, absent: 1, late: 1 },
          { month: 'May', present: 17, absent: 3, late: 1 },
          { month: 'Jun', present: 18, absent: 2, late: 1 },
          { month: 'Jul', present: 16, absent: 4, late: 1 },
          { month: 'Aug', present: 20, absent: 1, late: 0 },
          { month: 'Sep', present: 19, absent: 1, late: 1 },
          { month: 'Oct', present: 17, absent: 3, late: 1 },
          { month: 'Nov', present: 18, absent: 2, late: 1 },
          { month: 'Dec', present: 15, absent: 2, late: 2 },
        ]
      },
      {
        id: 'child-2',
        name: 'Fatima Ali',
        class: 'Arabic Grammar - Level 2',
        teacher: 'Aisha Rahman',
        overallAttendance: 92,
        weeklyAttendance: [
          { day: 'Mon', date: '2024-12-02', status: 'PRESENT', time: '5:00 PM' },
          { day: 'Tue', date: '2024-12-03', status: 'PRESENT', time: '5:00 PM' },
          { day: 'Wed', date: '2024-12-04', status: 'PRESENT', time: '5:00 PM' },
          { day: 'Thu', date: '2024-12-05', status: 'PRESENT', time: '5:00 PM' },
          { day: 'Fri', date: '2024-12-06', status: 'LATE', time: '5:10 PM' },
        ],
        monthlyAttendance: [
          { week: 'Week 1', present: 5, absent: 0, late: 0 },
          { week: 'Week 2', present: 4, absent: 0, late: 1 },
          { week: 'Week 3', present: 5, absent: 0, late: 0 },
          { week: 'Week 4', present: 4, absent: 0, late: 1 },
        ],
        yearlyAttendance: [
          { month: 'Jan', present: 20, absent: 1, late: 0 },
          { month: 'Feb', present: 19, absent: 1, late: 0 },
          { month: 'Mar', present: 21, absent: 0, late: 0 },
          { month: 'Apr', present: 20, absent: 0, late: 1 },
          { month: 'May', present: 19, absent: 1, late: 1 },
          { month: 'Jun', present: 20, absent: 1, late: 0 },
          { month: 'Jul', present: 19, absent: 1, late: 1 },
          { month: 'Aug', present: 21, absent: 0, late: 0 },
          { month: 'Sep', present: 20, absent: 0, late: 1 },
          { month: 'Oct', present: 19, absent: 1, late: 1 },
          { month: 'Nov', present: 20, absent: 1, late: 0 },
          { month: 'Dec', present: 18, absent: 1, late: 1 },
        ]
      }
    ]
  } else {
    // For now, use empty data - the API endpoint is available for future use
    attendanceData = []
  }

  return (
    <ParentAttendancePageClient attendanceData={attendanceData} />
  )
}
