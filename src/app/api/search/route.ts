export const runtime = 'nodejs'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { withRateLimit } from '@/lib/api-middleware'
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

async function handleGET(request: NextRequest) {
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

    // Search Students (including parent info, phone, email, address)
    try {
      const students = await prisma.student.findMany({
        where: {
          orgId: org.id,
          OR: [
            { firstName: { contains: searchQuery, mode: 'insensitive' } },
            { lastName: { contains: searchQuery, mode: 'insensitive' } },
            { 
              User: {
                OR: [
                  { name: { contains: searchQuery, mode: 'insensitive' } },
                  { email: { contains: searchQuery, mode: 'insensitive' } },
                  { phone: { contains: searchQuery, mode: 'insensitive' } },
                  { address: { contains: searchQuery, mode: 'insensitive' } },
                ],
              },
            },
          ],
        },
        include: {
          User: {
            select: {
              name: true,
              email: true,
              phone: true,
              address: true,
            },
          },
        },
        take: 20,
      })

      students.forEach((student) => {
        const parentInfo = []
        if (student.User?.name) parentInfo.push(student.User.name)
        if (student.User?.email) parentInfo.push(student.User.email)
        if (student.User?.phone) parentInfo.push(student.User.phone)
        if (student.User?.address) parentInfo.push(student.User.address)
        
        results.push({
          type: 'student',
          id: student.id,
          title: `${student.firstName} ${student.lastName}`,
          subtitle: parentInfo.length > 0 
            ? `Parent: ${parentInfo.join(' • ')}`
            : 'No parent information',
          url: `/students`,
          icon: 'User',
        })
      })
    } catch (error) {
      logger.error('Error searching students', error)
    }

    // Search Parents (User with PARENT role)
    try {
      const parentMemberships = await prisma.userOrgMembership.findMany({
        where: {
          orgId: org.id,
          role: 'PARENT',
          User: {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
              { phone: { contains: searchQuery, mode: 'insensitive' } },
              { address: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
            },
          },
        },
        take: 20,
      })

      parentMemberships.forEach((membership) => {
        const parentInfo = []
        if (membership.User.email) parentInfo.push(membership.User.email)
        if (membership.User.phone) parentInfo.push(membership.User.phone)
        if (membership.User.address) parentInfo.push(membership.User.address)
        
        results.push({
          type: 'parent',
          id: membership.User.id,
          title: membership.User.name || membership.User.email || 'Parent',
          subtitle: parentInfo.length > 0 
            ? parentInfo.join(' • ')
            : 'Parent account',
          url: `/students`, // Navigate to students page where they can see their children
          icon: 'Users',
        })
      })
    } catch (error) {
      logger.error('Error searching parents', error)
    }

    // Search Classes (including teacher info, phone, email)
    try {
      const classes = await prisma.class.findMany({
        where: {
          orgId: org.id,
          OR: [
            { name: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
            { room: { contains: searchQuery, mode: 'insensitive' } },
            { grade: { contains: searchQuery, mode: 'insensitive' } },
            {
              User: {
                OR: [
                  { name: { contains: searchQuery, mode: 'insensitive' } },
                  { email: { contains: searchQuery, mode: 'insensitive' } },
                  { phone: { contains: searchQuery, mode: 'insensitive' } },
                ],
              },
            },
          ],
        },
        include: {
          User: {
            select: {
              name: true,
              email: true,
              phone: true,
            },
          },
        },
        take: 20,
      })

      classes.forEach((classItem) => {
        const teacherInfo = []
        if (classItem.User?.name) teacherInfo.push(classItem.User.name)
        if (classItem.User?.email) teacherInfo.push(classItem.User.email)
        if (classItem.User?.phone) teacherInfo.push(classItem.User.phone)
        
        results.push({
          type: 'class',
          id: classItem.id,
          title: classItem.name,
          subtitle: teacherInfo.length > 0 
            ? `Teacher: ${teacherInfo.join(' • ')}`
            : 'Unassigned',
          url: `/classes/${classItem.id}`,
          icon: 'GraduationCap',
        })
      })
    } catch (error) {
      logger.error('Error searching classes', error)
    }

    // Search Staff (including phone, email, address)
    try {
      const staffMembers = await prisma.userOrgMembership.findMany({
        where: {
          orgId: org.id,
          role: { in: ['ADMIN', 'STAFF'] },
          User: {
            OR: [
              { name: { contains: searchQuery, mode: 'insensitive' } },
              { email: { contains: searchQuery, mode: 'insensitive' } },
              { phone: { contains: searchQuery, mode: 'insensitive' } },
              { address: { contains: searchQuery, mode: 'insensitive' } },
            ],
          },
        },
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              address: true,
            },
          },
        },
        take: 20,
      })

      staffMembers.forEach((membership) => {
        const staffInfo = []
        if (membership.User.email) staffInfo.push(membership.User.email)
        if (membership.User.phone) staffInfo.push(membership.User.phone)
        if (membership.User.address) staffInfo.push(membership.User.address)
        
        results.push({
          type: 'staff',
          id: membership.User.id,
          title: membership.User.name || membership.User.email,
          subtitle: staffInfo.length > 0 
            ? `${membership.role} • ${staffInfo.join(' • ')}`
            : `Role: ${membership.role}`,
          url: `/staff/${membership.User.id}`,
          icon: 'UserCheck',
        })
      })
    } catch (error) {
      logger.error('Error searching staff', error)
    }

    // Search Payment Records (including student and parent info)
    try {
      const paymentRecords = await prisma.monthlyPaymentRecord.findMany({
        where: {
          Student: {
            orgId: org.id,
            OR: [
              { firstName: { contains: searchQuery, mode: 'insensitive' } },
              { lastName: { contains: searchQuery, mode: 'insensitive' } },
              {
                User: {
                  OR: [
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                    { email: { contains: searchQuery, mode: 'insensitive' } },
                    { phone: { contains: searchQuery, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        },
        include: {
          Student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              User: {
                select: {
                  name: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
          Class: {
            select: {
              name: true,
            },
          },
        },
        take: 20,
      })

      paymentRecords.forEach((record) => {
        const month = new Date(record.month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
        const parentInfo = record.Student.User?.name || record.Student.User?.email || ''
        results.push({
          type: 'payment',
          id: record.id,
          title: `${record.Student.firstName} ${record.Student.lastName} - ${month}`,
          subtitle: `Class: ${record.Class?.name || 'N/A'} • Amount: £${record.amount.toFixed(2)} • Status: ${record.status}${parentInfo ? ` • Parent: ${parentInfo}` : ''}`,
          url: `/payments`,
          icon: 'FileText',
        })
      })
    } catch (error) {
      logger.error('Error searching payments', error)
    }

    // Search Invoices
    try {
      const invoices = await prisma.invoice.findMany({
        where: {
          Student: {
            orgId: org.id,
            OR: [
              { firstName: { contains: searchQuery, mode: 'insensitive' } },
              { lastName: { contains: searchQuery, mode: 'insensitive' } },
              {
                User: {
                  OR: [
                    { name: { contains: searchQuery, mode: 'insensitive' } },
                    { email: { contains: searchQuery, mode: 'insensitive' } },
                    { phone: { contains: searchQuery, mode: 'insensitive' } },
                  ],
                },
              },
            ],
          },
        },
        include: {
          Student: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              User: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          Class: {
            select: {
              name: true,
            },
          },
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      })

      invoices.forEach((invoice) => {
        const parentInfo = invoice.Student.User?.name || invoice.Student.User?.email || ''
        results.push({
          type: 'invoice',
          id: invoice.id,
          title: `Invoice ${invoice.invoiceNumber} - ${invoice.Student.firstName} ${invoice.Student.lastName}`,
          subtitle: `Class: ${invoice.Class?.name || 'N/A'} • Amount: £${(invoice.amountP / 100).toFixed(2)} • Status: ${invoice.status}${parentInfo ? ` • Parent: ${parentInfo}` : ''}`,
          url: `/invoices`,
          icon: 'FileText',
        })
      })
    } catch (error) {
      logger.error('Error searching invoices', error)
    }

    // Search Messages (including all fields)
    try {
      const messages = await prisma.message.findMany({
        where: {
          orgId: org.id,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { body: { contains: searchQuery, mode: 'insensitive' } },
            { type: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      })

      messages.forEach((message) => {
        const date = formatDate(message.createdAt)
        const messagePreview = message.body?.substring(0, 60) || ''
        results.push({
          type: 'message',
          id: message.id,
          title: message.title,
          subtitle: messagePreview 
            ? `Sent: ${date} • ${messagePreview}${messagePreview.length >= 60 ? '...' : ''}`
            : `Sent: ${date}`,
          url: `/messages`,
          icon: 'MessageSquare',
        })
      })
    } catch (error) {
      logger.error('Error searching messages', error)
    }

    // Search Events (including all fields)
    try {
      const events = await prisma.event.findMany({
        where: {
          orgId: org.id,
          OR: [
            { title: { contains: searchQuery, mode: 'insensitive' } },
            { description: { contains: searchQuery, mode: 'insensitive' } },
            { location: { contains: searchQuery, mode: 'insensitive' } },
            { type: { contains: searchQuery, mode: 'insensitive' } },
          ],
        },
        include: {
          Class: {
            select: {
              name: true,
            },
          },
        },
        take: 20,
        orderBy: { startDate: 'asc' },
      })

      events.forEach((event) => {
        const date = formatDate(event.startDate)
        const eventInfo = []
        if (event.location) eventInfo.push(event.location)
        if (event.Class?.name) eventInfo.push(`Class: ${event.Class.name}`)
        if (event.type) eventInfo.push(`Type: ${event.type}`)
        
        results.push({
          type: 'event',
          id: event.id,
          title: event.title,
          subtitle: eventInfo.length > 0 
            ? `Date: ${date} • ${eventInfo.join(' • ')}`
            : `Date: ${date}`,
          url: `/calendar`,
          icon: 'Calendar',
        })
      })
    } catch (error) {
      logger.error('Error searching events', error)
    }

    // Search Applications (including all fields and children)
    try {
      const applications = await prisma.application.findMany({
        where: {
          orgId: org.id,
          OR: [
            { guardianName: { contains: searchQuery, mode: 'insensitive' } },
            { guardianEmail: { contains: searchQuery, mode: 'insensitive' } },
            { guardianPhone: { contains: searchQuery, mode: 'insensitive' } },
            { guardianAddress: { contains: searchQuery, mode: 'insensitive' } },
            { studentName: { contains: searchQuery, mode: 'insensitive' } },
            { preferredClass: { contains: searchQuery, mode: 'insensitive' } },
            { additionalNotes: { contains: searchQuery, mode: 'insensitive' } },
            { adminNotes: { contains: searchQuery, mode: 'insensitive' } },
            {
              ApplicationChild: {
                some: {
                  OR: [
                    { firstName: { contains: searchQuery, mode: 'insensitive' } },
                    { lastName: { contains: searchQuery, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        },
        include: {
          ApplicationChild: {
            select: {
              firstName: true,
              lastName: true,
            },
          },
        },
        take: 20,
        orderBy: { createdAt: 'desc' },
      })

      applications.forEach((app) => {
        const appInfo = []
        if (app.guardianEmail) appInfo.push(app.guardianEmail)
        if (app.guardianPhone) appInfo.push(app.guardianPhone)
        if (app.guardianAddress) appInfo.push(app.guardianAddress)
        
        const childrenNames = app.ApplicationChild.map(child => `${child.firstName} ${child.lastName}`).join(', ')
        const title = childrenNames || app.studentName || 'Application'
        
        results.push({
          type: 'application',
          id: app.id,
          title: `${title} - ${app.guardianName}`,
          subtitle: appInfo.length > 0 
            ? `Status: ${app.status} • ${appInfo.join(' • ')}`
            : `Status: ${app.status}`,
          url: `/applications`,
          icon: 'FileCheck',
        })
      })
    } catch (error) {
      logger.error('Error searching applications', error)
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

    return NextResponse.json({ results: sortedResults.slice(0, 100) })

  } catch (error) {
    logger.error('Search error', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}

export const GET = withRateLimit(handleGET)
