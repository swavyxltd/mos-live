// Demo attendance data for different weeks
export function getAttendanceDataForWeek(weekDate: Date) {
  const weekStart = getWeekStart(weekDate)
  const weekNumber = getWeekNumber(weekStart)
  
  // Don't return data for future weeks
  const today = new Date()
  if (weekStart > today) {
    return { classes: [] }
  }
  
  // Different data for different weeks
  const weekData = {
    1: { // Current week (Week 6)
      classes: [
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
    },
    2: { // Week 5
      classes: [
        {
          id: 'demo-attendance-1',
          name: 'Quran Recitation - Level 1',
          teacher: 'Omar Khan',
          date: new Date('2024-11-29'),
          totalStudents: 3,
          present: 3,
          absent: 0,
          late: 0,
          students: [
            { 
              id: 's1',
              name: 'Ahmed Hassan', 
              status: 'PRESENT', 
              time: '4:00 PM',
              attendancePercentage: 100,
              weeklyAttendance: [
                { day: 'Mon', status: 'PRESENT', time: '4:00 PM' },
                { day: 'Tue', status: 'PRESENT', time: '3:58 PM' },
                { day: 'Wed', status: 'PRESENT', time: '4:01 PM' },
                { day: 'Thu', status: 'PRESENT', time: '3:59 PM' },
                { day: 'Fri', status: 'PRESENT', time: '4:02 PM' }
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
              status: 'PRESENT', 
              time: '4:05 PM',
              attendancePercentage: 100,
              weeklyAttendance: [
                { day: 'Mon', status: 'PRESENT', time: '4:05 PM' },
                { day: 'Tue', status: 'PRESENT', time: '4:02 PM' },
                { day: 'Wed', status: 'PRESENT', time: '4:01 PM' },
                { day: 'Thu', status: 'PRESENT', time: '4:03 PM' },
                { day: 'Fri', status: 'PRESENT', time: '4:00 PM' }
              ]
            }
          ]
        }
      ]
    },
    3: { // Week 4
      classes: [
        {
          id: 'demo-attendance-1',
          name: 'Quran Recitation - Level 1',
          teacher: 'Omar Khan',
          date: new Date('2024-11-22'),
          totalStudents: 3,
          present: 1,
          absent: 1,
          late: 1,
          students: [
            { 
              id: 's1',
              name: 'Ahmed Hassan', 
              status: 'PRESENT', 
              time: '4:00 PM',
              attendancePercentage: 60,
              weeklyAttendance: [
                { day: 'Mon', status: 'PRESENT', time: '4:00 PM' },
                { day: 'Tue', status: 'ABSENT' },
                { day: 'Wed', status: 'ABSENT' },
                { day: 'Thu', status: 'PRESENT', time: '4:01 PM' },
                { day: 'Fri', status: 'LATE', time: '4:15 PM' }
              ]
            },
            { 
              id: 's2',
              name: 'Fatima Ali', 
              status: 'ABSENT', 
              time: null,
              attendancePercentage: 40,
              weeklyAttendance: [
                { day: 'Mon', status: 'ABSENT' },
                { day: 'Tue', status: 'ABSENT' },
                { day: 'Wed', status: 'PRESENT', time: '4:02 PM' },
                { day: 'Thu', status: 'ABSENT' },
                { day: 'Fri', status: 'ABSENT' }
              ]
            },
            { 
              id: 's3',
              name: 'Yusuf Patel', 
              status: 'LATE', 
              time: '4:15 PM',
              attendancePercentage: 80,
              weeklyAttendance: [
                { day: 'Mon', status: 'LATE', time: '4:15 PM' },
                { day: 'Tue', status: 'PRESENT', time: '4:05 PM' },
                { day: 'Wed', status: 'PRESENT', time: '4:01 PM' },
                { day: 'Thu', status: 'LATE', time: '4:12 PM' },
                { day: 'Fri', status: 'PRESENT', time: '4:00 PM' }
              ]
            }
          ]
        }
      ]
    },
    4: { // Week 3
      classes: [
        {
          id: 'demo-attendance-1',
          name: 'Quran Recitation - Level 1',
          teacher: 'Omar Khan',
          date: new Date('2024-11-15'),
          totalStudents: 3,
          present: 2,
          absent: 1,
          late: 0,
          students: [
            { 
              id: 's1',
              name: 'Ahmed Hassan', 
              status: 'PRESENT', 
              time: '4:00 PM',
              attendancePercentage: 80,
              weeklyAttendance: [
                { day: 'Mon', status: 'PRESENT', time: '4:00 PM' },
                { day: 'Tue', status: 'PRESENT', time: '3:58 PM' },
                { day: 'Wed', status: 'ABSENT' },
                { day: 'Thu', status: 'PRESENT', time: '4:01 PM' },
                { day: 'Fri', status: 'PRESENT', time: '3:59 PM' }
              ]
            },
            { 
              id: 's2',
              name: 'Fatima Ali', 
              status: 'ABSENT', 
              time: null,
              attendancePercentage: 60,
              weeklyAttendance: [
                { day: 'Mon', status: 'ABSENT' },
                { day: 'Tue', status: 'PRESENT', time: '3:57 PM' },
                { day: 'Wed', status: 'ABSENT' },
                { day: 'Thu', status: 'PRESENT', time: '3:59 PM' },
                { day: 'Fri', status: 'ABSENT' }
              ]
            },
            { 
              id: 's3',
              name: 'Yusuf Patel', 
              status: 'PRESENT', 
              time: '4:05 PM',
              attendancePercentage: 100,
              weeklyAttendance: [
                { day: 'Mon', status: 'PRESENT', time: '4:05 PM' },
                { day: 'Tue', status: 'PRESENT', time: '4:02 PM' },
                { day: 'Wed', status: 'PRESENT', time: '4:01 PM' },
                { day: 'Thu', status: 'PRESENT', time: '4:03 PM' },
                { day: 'Fri', status: 'PRESENT', time: '4:00 PM' }
              ]
            }
          ]
        },
        {
          id: 'demo-attendance-2',
          name: 'Islamic Studies - Level 2',
          teacher: 'Aisha Patel',
          date: new Date('2024-11-14'),
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
              attendancePercentage: 80,
              weeklyAttendance: [
                { day: 'Mon', status: 'PRESENT', time: '5:00 PM' },
                { day: 'Tue', status: 'ABSENT' },
                { day: 'Wed', status: 'PRESENT', time: '5:02 PM' },
                { day: 'Thu', status: 'PRESENT', time: '4:58 PM' },
                { day: 'Fri', status: 'ABSENT' }
              ]
            },
            { 
              id: 's5',
              name: 'Hassan Khan', 
              status: 'ABSENT', 
              time: null,
              attendancePercentage: 40,
              weeklyAttendance: [
                { day: 'Mon', status: 'ABSENT' },
                { day: 'Tue', status: 'ABSENT' },
                { day: 'Wed', status: 'PRESENT', time: '5:02 PM' },
                { day: 'Thu', status: 'ABSENT' },
                { day: 'Fri', status: 'ABSENT' }
              ]
            }
          ]
        }
      ]
    },
    5: { // Week 2
      classes: [
        {
          id: 'demo-attendance-1',
          name: 'Quran Recitation - Level 1',
          teacher: 'Omar Khan',
          date: new Date('2024-11-08'),
          totalStudents: 3,
          present: 1,
          absent: 1,
          late: 1,
          students: [
            { 
              id: 's1',
              name: 'Ahmed Hassan', 
              status: 'LATE', 
              time: '4:15 PM',
              attendancePercentage: 60,
              weeklyAttendance: [
                { day: 'Mon', status: 'ABSENT' },
                { day: 'Tue', status: 'LATE', time: '4:15 PM' },
                { day: 'Wed', status: 'PRESENT', time: '4:01 PM' },
                { day: 'Thu', status: 'ABSENT' },
                { day: 'Fri', status: 'LATE', time: '4:12 PM' }
              ]
            },
            { 
              id: 's2',
              name: 'Fatima Ali', 
              status: 'ABSENT', 
              time: null,
              attendancePercentage: 40,
              weeklyAttendance: [
                { day: 'Mon', status: 'ABSENT' },
                { day: 'Tue', status: 'ABSENT' },
                { day: 'Wed', status: 'PRESENT', time: '4:02 PM' },
                { day: 'Thu', status: 'ABSENT' },
                { day: 'Fri', status: 'ABSENT' }
              ]
            },
            { 
              id: 's3',
              name: 'Yusuf Patel', 
              status: 'PRESENT', 
              time: '4:05 PM',
              attendancePercentage: 80,
              weeklyAttendance: [
                { day: 'Mon', status: 'PRESENT', time: '4:05 PM' },
                { day: 'Tue', status: 'LATE', time: '4:18 PM' },
                { day: 'Wed', status: 'PRESENT', time: '4:01 PM' },
                { day: 'Thu', status: 'PRESENT', time: '4:03 PM' },
                { day: 'Fri', status: 'LATE', time: '4:15 PM' }
              ]
            }
          ]
        }
      ]
    },
    6: { // Week 1 (6 weeks ago)
      classes: [
        {
          id: 'demo-attendance-1',
          name: 'Quran Recitation - Level 1',
          teacher: 'Omar Khan',
          date: new Date('2024-11-01'),
          totalStudents: 3,
          present: 3,
          absent: 0,
          late: 0,
          students: [
            { 
              id: 's1',
              name: 'Ahmed Hassan', 
              status: 'PRESENT', 
              time: '4:00 PM',
              attendancePercentage: 100,
              weeklyAttendance: [
                { day: 'Mon', status: 'PRESENT', time: '4:00 PM' },
                { day: 'Tue', status: 'PRESENT', time: '3:58 PM' },
                { day: 'Wed', status: 'PRESENT', time: '4:01 PM' },
                { day: 'Thu', status: 'PRESENT', time: '3:59 PM' },
                { day: 'Fri', status: 'PRESENT', time: '4:02 PM' }
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
              status: 'PRESENT', 
              time: '4:05 PM',
              attendancePercentage: 100,
              weeklyAttendance: [
                { day: 'Mon', status: 'PRESENT', time: '4:05 PM' },
                { day: 'Tue', status: 'PRESENT', time: '4:02 PM' },
                { day: 'Wed', status: 'PRESENT', time: '4:01 PM' },
                { day: 'Thu', status: 'PRESENT', time: '4:03 PM' },
                { day: 'Fri', status: 'PRESENT', time: '4:00 PM' }
              ]
            }
          ]
        },
        {
          id: 'demo-attendance-2',
          name: 'Islamic Studies - Level 2',
          teacher: 'Aisha Patel',
          date: new Date('2024-10-31'),
          totalStudents: 2,
          present: 2,
          absent: 0,
          late: 0,
          students: [
            { 
              id: 's4',
              name: 'Mariam Ahmed', 
              status: 'PRESENT', 
              time: '5:00 PM',
              attendancePercentage: 100,
              weeklyAttendance: [
                { day: 'Mon', status: 'PRESENT', time: '5:00 PM' },
                { day: 'Tue', status: 'PRESENT', time: '4:58 PM' },
                { day: 'Wed', status: 'PRESENT', time: '5:02 PM' },
                { day: 'Thu', status: 'PRESENT', time: '4:58 PM' },
                { day: 'Fri', status: 'PRESENT', time: '5:01 PM' }
              ]
            },
            { 
              id: 's5',
              name: 'Hassan Khan', 
              status: 'PRESENT', 
              time: '5:05 PM',
              attendancePercentage: 100,
              weeklyAttendance: [
                { day: 'Mon', status: 'PRESENT', time: '5:05 PM' },
                { day: 'Tue', status: 'PRESENT', time: '5:02 PM' },
                { day: 'Wed', status: 'PRESENT', time: '5:01 PM' },
                { day: 'Thu', status: 'PRESENT', time: '5:03 PM' },
                { day: 'Fri', status: 'PRESENT', time: '5:00 PM' }
              ]
            }
          ]
        }
      ]
    }
  }
  
  return weekData[weekNumber as keyof typeof weekData] || weekData[1]
}

function getWeekStart(date: Date) {
  const start = new Date(date)
  const day = start.getDay()
  const diff = start.getDate() - day + (day === 0 ? -6 : 1) // Monday
  start.setDate(diff)
  return start
}

function getWeekNumber(date: Date) {
  // Simple week number calculation for demo
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - date.getTime())
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7))
  return Math.min(diffWeeks + 1, 6) // Cap at 6 weeks for demo
}
