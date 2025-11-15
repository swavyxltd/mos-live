export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { formatDate } from '@/lib/utils'

// Static navigation pages
const navigationPages = [
  { name: 'Dashboard', href: '/dashboard', icon: 'Home', type: 'page' },
  { name: 'Classes', href: '/classes', icon: 'GraduationCap', type: 'page' },
  { name: 'Students', href: '/students', icon: 'Users', type: 'page' },
  { name: 'Applications', href: '/applications', icon: 'FileCheck', type: 'page' },
  { name: 'Staff', href: '/staff', icon: 'UserCheck', type: 'page' },
  { name: 'Attendance', href: '/attendance', icon: 'ClipboardList', type: 'page' },
  { name: 'Finances', href: '/finances', icon: 'DollarSign', type: 'page' },
  { name: 'Fees', href: '/fees', icon: 'CreditCard', type: 'page' },
  { name: 'Payments', href: '/payments', icon: 'FileText', type: 'page' },
  { name: 'Messages', href: '/messages', icon: 'MessageSquare', type: 'page' },
  { name: 'Calendar', href: '/calendar', icon: 'Calendar', type: 'page' },
  { name: 'Support', href: '/support', icon: 'HelpCircle', type: 'page' },
  { name: 'Settings', href: '/settings', icon: 'Settings', type: 'page' },
]

// Settings sub-pages
const settingsPages = [
  { name: 'Profile Settings', href: '/settings?tab=profile', icon: 'User', type: 'settings' },
  { name: 'Organization Settings', href: '/settings?tab=organization', icon: 'Building2', type: 'settings' },
  { name: 'Payment Methods', href: '/settings?tab=payment-methods', icon: 'CreditCard', type: 'settings' },
  { name: 'Your Subscription', href: '/settings?tab=subscription', icon: 'Package', type: 'settings' },
  { name: 'Billing History', href: '/settings?tab=billing', icon: 'FileText', type: 'settings' },
]

// FAQ data
const faqData = [
  { question: 'How do I set up my madrasah on Madrasah OS?', category: 'Getting Started', href: '/support/faq', icon: 'Rocket', type: 'faq' },
  { question: 'What information do I need to provide during setup?', category: 'Getting Started', href: '/support/faq', icon: 'Rocket', type: 'faq' },
  { question: 'How do I invite teachers to join my madrasah?', category: 'Getting Started', href: '/support/faq', icon: 'Rocket', type: 'faq' },
  { question: 'How do I add students to my madrasah?', category: 'Student Management', href: '/support/faq', icon: 'Users', type: 'faq' },
  { question: 'Can parents add their own children?', category: 'Student Management', href: '/support/faq', icon: 'Users', type: 'faq' },
  { question: 'How do I mark attendance?', category: 'Student Management', href: '/support/faq', icon: 'Users', type: 'faq' },
  { question: 'How do I record student progress?', category: 'Student Management', href: '/support/faq', icon: 'Users', type: 'faq' },
  { question: 'How do I set up fees for my classes?', category: 'Billing & Payments', href: '/support/faq', icon: 'CreditCard', type: 'faq' },
  { question: 'How do parents pay their fees?', category: 'Billing & Payments', href: '/support/faq', icon: 'CreditCard', type: 'faq' },
  { question: 'What payment methods do you support?', category: 'Billing & Payments', href: '/support/faq', icon: 'CreditCard', type: 'faq' },
  { question: 'How do I generate invoices?', category: 'Billing & Payments', href: '/support/faq', icon: 'CreditCard', type: 'faq' },
  { question: 'How do I send announcements to parents?', category: 'Communication', href: '/support/faq', icon: 'MessageSquare', type: 'faq' },
  { question: 'How do I set up WhatsApp messaging?', category: 'Communication', href: '/support/faq', icon: 'MessageSquare', type: 'faq' },
  { question: 'Can parents reply to messages?', category: 'Communication', href: '/support/faq', icon: 'MessageSquare', type: 'faq' },
  { question: 'What browsers are supported?', category: 'Technical Support', href: '/support/faq', icon: 'Wrench', type: 'faq' },
  { question: 'Is my data secure?', category: 'Technical Support', href: '/support/faq', icon: 'Wrench', type: 'faq' },
  { question: 'Can I export my data?', category: 'Technical Support', href: '/support/faq', icon: 'Wrench', type: 'faq' },
  { question: 'What if I forget my password?', category: 'Technical Support', href: '/support/faq', icon: 'Wrench', type: 'faq' },
]

// Documentation topics
const documentationTopics = [
  { title: 'Welcome to Madrasah OS', href: '/support/docs', icon: 'BookOpen', type: 'guide' },
  { title: 'Dashboard Overview', href: '/support/docs', icon: 'BarChart3', type: 'guide' },
  { title: 'Student Management', href: '/support/docs', icon: 'Users', type: 'guide' },
  { title: 'Class Management', href: '/support/docs', icon: 'GraduationCap', type: 'guide' },
  { title: 'Attendance Tracking', href: '/support/docs', icon: 'ClipboardList', type: 'guide' },
  { title: 'Fee Management', href: '/support/docs', icon: 'CreditCard', type: 'guide' },
  { title: 'Payment Processing', href: '/support/docs', icon: 'FileText', type: 'guide' },
  { title: 'Messaging & Communication', href: '/support/docs', icon: 'MessageSquare', type: 'guide' },
  { title: 'Calendar & Events', href: '/support/docs', icon: 'Calendar', type: 'guide' },
  { title: 'Reports & Analytics', href: '/support/docs', icon: 'TrendingUp', type: 'guide' },
]

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

    const searchQuery = query.toLowerCase().trim()
    const results: any[] = []

    // Get active organization
    const org = await getActiveOrg(session.user.id)
    if (!org) {
      return NextResponse.json({ results: [] })
    }

    // Security: Verify user has access to this organization
    const userMembership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: org.id,
        },
      },
    })

    if (!userMembership) {
      // User doesn't have access to this organization - return empty results
      return NextResponse.json({ results: [] })
    }

    // Search Students
    try {
      const students = await prisma.student.findMany({
        where: {
          orgId: org.id,
          OR: [
            { firstName: { contains: searchQuery, mode: 'insensitive' } },
            { lastName: { contains: searchQuery, mode: 'insensitive' } },
            { email: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        include: {
          User: {
            select: {
              name: true,
              email: true,
            },
          },
        },
        take: 10,
      })

      students.forEach((student) => {
        results.push({
          type: 'student',
          id: student.id,
          title: `${student.firstName} ${student.lastName}`,
          subtitle: `Parent: ${student.User?.name || student.User?.email || 'N/A'}`,
          url: `/students`,
          icon: 'User',
        })
      })
    } catch (error) {
      console.error('Error searching students:', error)
    }

    // Search Classes
    try {
      const classes = await prisma.class.findMany({
        where: {
          orgId: org.id,
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        include: {
          User: {
            select: {
              name: true,
            },
          },
        },
        take: 10,
      })

      classes.forEach((classItem) => {
        results.push({
          type: 'class',
          id: classItem.id,
          title: classItem.name,
          subtitle: `Teacher: ${classItem.User?.name || 'Unassigned'}`,
          url: `/classes/${classItem.id}`,
          icon: 'GraduationCap',
        })
      })
    } catch (error) {
      console.error('Error searching classes:', error)
    }

    // Search Staff
    try {
      const staffMembers = await prisma.userOrgMembership.findMany({
        where: {
          orgId: org.id,
          role: { in: ['ADMIN', 'STAFF'] },
          User: {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        take: 10,
      })

      staffMembers.forEach((membership) => {
        results.push({
          type: 'staff',
          id: membership.User.id,
          title: membership.User.name || membership.User.email,
          subtitle: `Role: ${membership.role}`,
          url: `/staff/${membership.User.id}`,
          icon: 'UserCheck',
        })
      })
    } catch (error) {
      console.error('Error searching staff:', error)
    }

    // Search Payment Records
    try {
      const paymentRecords = await prisma.monthlyPaymentRecord.findMany({
        where: {
          Student: {
            orgId: org.id,
            OR: [
              { firstName: { contains: searchQuery, mode: 'insensitive' } },
              { lastName: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
        },
        include: {
          Student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          Class: {
            select: {
              name: true,
            },
          },
        },
        take: 10,
      })

      paymentRecords.forEach((record) => {
        const month = new Date(record.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        results.push({
          type: 'payment',
          id: record.id,
          title: `${record.Student.firstName} ${record.Student.lastName} - ${month}`,
          subtitle: `Class: ${record.Class?.name || 'N/A'} • Amount: £${record.amount.toFixed(2)} • Status: ${record.status}`,
          url: `/payments`,
          icon: 'FileText',
        })
      })
    } catch (error) {
      console.error('Error searching payments:', error)
    }

    // Search Messages
    try {
      const messages = await prisma.message.findMany({
        where: {
          orgId: org.id,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { body: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      })

      messages.forEach((message) => {
        const date = formatDate(message.createdAt)
        results.push({
          type: 'message',
          id: message.id,
          title: message.title,
          subtitle: `Sent: ${date}`,
          url: `/messages`,
          icon: 'MessageSquare',
        })
      })
    } catch (error) {
      console.error('Error searching messages:', error)
    }

    // Search Events
    try {
      const events = await prisma.event.findMany({
        where: {
          orgId: org.id,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { startDate: 'asc' },
      })

      events.forEach((event) => {
        const date = formatDate(event.startDate)
        results.push({
          type: 'event',
          id: event.id,
          title: event.title,
          subtitle: `Date: ${date}`,
          url: `/calendar`,
          icon: 'Calendar',
        })
      })
    } catch (error) {
      console.error('Error searching events:', error)
    }

    // Search Applications
    try {
      const applications = await prisma.application.findMany({
        where: {
          orgId: org.id,
          OR: [
            { guardianName: { contains: searchQuery, mode: 'insensitive' } },
            { guardianEmail: { contains: searchQuery, mode: 'insensitive' } },
            { studentName: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      })

      applications.forEach((app) => {
        results.push({
          type: 'application',
          id: app.id,
          title: `${app.studentName} - ${app.guardianName}`,
          subtitle: `Status: ${app.status} • ${app.guardianEmail}`,
          url: `/applications`,
          icon: 'FileCheck',
        })
      })
    } catch (error) {
      console.error('Error searching applications:', error)
    }

    // Search Navigation Pages
    navigationPages.forEach((page) => {
      if (page.name.toLowerCase().includes(searchQuery)) {
        results.push({
          type: 'page',
          id: page.href,
          title: page.name,
          subtitle: 'Navigation page',
          url: page.href,
          icon: page.icon,
        })
      }
    })

    // Search Settings Pages
    settingsPages.forEach((page) => {
      if (page.name.toLowerCase().includes(searchQuery)) {
        results.push({
          type: 'settings',
          id: page.href,
          title: page.name,
          subtitle: 'Settings page',
          url: page.href,
          icon: page.icon,
        })
      }
    })

    // Search FAQs
    faqData.forEach((faq) => {
      if (
        faq.question.toLowerCase().includes(searchQuery) ||
        faq.category.toLowerCase().includes(searchQuery)
      ) {
        results.push({
          type: 'faq',
          id: `faq-${faq.question}`,
          title: faq.question,
          subtitle: `Category: ${faq.category}`,
          url: faq.href,
          icon: faq.icon,
        })
      }
    })

    // Search Documentation
    documentationTopics.forEach((doc) => {
      if (doc.title.toLowerCase().includes(searchQuery)) {
        results.push({
          type: 'guide',
          id: `doc-${doc.title}`,
          title: doc.title,
          subtitle: 'Documentation guide',
          url: doc.href,
          icon: doc.icon,
        })
      }
    })

    // Sort results by relevance (exact matches first, then partial matches)
    const sortedResults = results.sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase().startsWith(searchQuery)
      const bTitleMatch = b.title.toLowerCase().startsWith(searchQuery)
      if (aTitleMatch && !bTitleMatch) return -1
      if (!aTitleMatch && bTitleMatch) return 1
      return 0
    })

    return NextResponse.json({ results: sortedResults.slice(0, 50) })

  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
