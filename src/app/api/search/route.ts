import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] })
    }

    // Comprehensive demo data for search
    const demoResults = [
      // Students
      {
        type: 'student',
        id: '1',
        title: 'Ahmed Hassan',
        subtitle: 'Parent: Mohammed Hassan',
        url: '/students',
        icon: '👨‍🎓'
      },
      {
        type: 'student',
        id: '2',
        title: 'Aisha Khan',
        subtitle: 'Parent: Fatima Khan',
        url: '/students',
        icon: '👨‍🎓'
      },
      {
        type: 'student',
        id: '3',
        title: 'Omar Ali',
        subtitle: 'Parent: Hassan Ali',
        url: '/students',
        icon: '👨‍🎓'
      },
      {
        type: 'student',
        id: '4',
        title: 'Fatima Ahmed',
        subtitle: 'Parent: Ahmed Mohammed',
        url: '/students',
        icon: '👨‍🎓'
      },
      // Classes
      {
        type: 'class',
        id: '1',
        title: 'Quran Recitation - Level 1',
        subtitle: 'Teacher: Omar Khan',
        url: '/classes',
        icon: '📚'
      },
      {
        type: 'class',
        id: '2',
        title: 'Islamic Studies - Level 2',
        subtitle: 'Teacher: Aisha Patel',
        url: '/classes',
        icon: '📚'
      },
      {
        type: 'class',
        id: '3',
        title: 'Arabic Grammar',
        subtitle: 'Teacher: Hassan Ali',
        url: '/classes',
        icon: '📚'
      },
      // Staff
      {
        type: 'staff',
        id: '1',
        title: 'Ahmed Hassan',
        subtitle: 'Role: ADMIN',
        url: '/settings',
        icon: '👨‍🏫'
      },
      {
        type: 'staff',
        id: '2',
        title: 'Omar Khan',
        subtitle: 'Role: TEACHER',
        url: '/settings',
        icon: '👨‍🏫'
      },
      {
        type: 'staff',
        id: '3',
        title: 'Aisha Patel',
        subtitle: 'Role: TEACHER',
        url: '/settings',
        icon: '👨‍🏫'
      },
      // Invoices
      {
        type: 'invoice',
        id: '1',
        title: 'Invoice for Ahmed Hassan',
        subtitle: 'Amount: £50.00',
        url: '/invoices',
        icon: '💰'
      },
      {
        type: 'invoice',
        id: '2',
        title: 'Invoice for Aisha Khan',
        subtitle: 'Amount: £45.00',
        url: '/invoices',
        icon: '💰'
      },
      // Messages
      {
        type: 'message',
        id: '1',
        title: 'Message to Parents',
        subtitle: 'Sent: 2 hours ago',
        url: '/messages',
        icon: '💬'
      },
      {
        type: 'message',
        id: '2',
        title: 'Announcement: End of Term',
        subtitle: 'Sent: 1 day ago',
        url: '/messages',
        icon: '💬'
      },
      // Attendance
      {
        type: 'attendance',
        id: '1',
        title: 'Today\'s Attendance',
        subtitle: '89% attendance rate',
        url: '/attendance',
        icon: '📊'
      },
      {
        type: 'attendance',
        id: '2',
        title: 'Weekly Report',
        subtitle: 'Quran Level 1 class',
        url: '/attendance',
        icon: '📊'
      },
      // Calendar Events
      {
        type: 'event',
        id: '1',
        title: 'End of Term Exams',
        subtitle: 'Dec 16, 2024',
        url: '/calendar',
        icon: '📅'
      },
      {
        type: 'event',
        id: '2',
        title: 'Parent-Teacher Meeting',
        subtitle: 'Dec 20, 2024',
        url: '/calendar',
        icon: '📅'
      },
      // Fees
      {
        type: 'fee',
        id: '1',
        title: 'Monthly Fee Collection',
        subtitle: 'Due: End of month',
        url: '/fees',
        icon: '💳'
      },
      {
        type: 'fee',
        id: '2',
        title: 'Registration Fee',
        subtitle: 'New students only',
        url: '/fees',
        icon: '💳'
      }
    ]

    // Filter demo results based on query
    const filteredResults = demoResults.filter(result => 
      result.title.toLowerCase().includes(query.toLowerCase()) ||
      result.subtitle.toLowerCase().includes(query.toLowerCase())
    )

    return NextResponse.json({ results: filteredResults })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
