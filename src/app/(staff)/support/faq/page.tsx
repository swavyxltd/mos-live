'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ArrowLeft, ChevronDown, ChevronUp, HelpCircle, Rocket, Users, CreditCard, MessageSquare, Settings, FileText, Calendar, DollarSign } from 'lucide-react'
import Link from 'next/link'

export default function FAQPage() {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')

  const toggleExpanded = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const faqCategories = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: Rocket,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      questions: [
        {
          question: 'How do I complete the initial setup?',
          answer: 'When you first sign up, you\'ll go through an onboarding process with three steps: 1) Admin Profile - enter your name and contact details, 2) Organisation Details - add your madrasah\'s address, contact information, and office hours, 3) Payment Methods - configure payment acceptance and set your billing day. You must complete all steps before you can start using the platform.',
          tags: ['setup', 'onboarding']
        },
        {
          question: 'Why do I need to set a billing day before adding students?',
          answer: 'The billing day (1-28) is when automatic card payments are processed for parents and when monthly invoices are due. It\'s a critical setting that affects payment processing, so it must be configured before you can add students. Go to Settings → Payment Methods to set your billing day.',
          tags: ['billing day', 'setup', 'required']
        },
        {
          question: 'Do I need to add a payment method before using the platform?',
          answer: 'Yes, you must add a payment method for platform billing before you can add students, staff, or use most features. This enables your 30-day free trial. After the trial, you\'ll be charged £2 per active student monthly. Go to Settings → Your Subscription to add your payment method.',
          tags: ['payment', 'subscription', 'trial']
        },
        {
          question: 'What happens during the free trial?',
          answer: 'You get 30 days free from signup. During this time, you can use all features without being charged. After the trial ends, you\'ll be automatically charged £2 per active student per month. You can add as many students as you want during the trial.',
          tags: ['trial', 'billing', 'subscription']
        }
      ]
    },
    {
      id: 'student-management',
      title: 'Student Management',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      questions: [
        {
          question: 'How do I add students to my madrasah?',
          answer: 'You can add students in three ways: 1) Individual entry - use the Quick Add menu or go to Students page and click "Add Student", 2) Bulk upload - use the CSV import feature on the Students page, 3) Accept applications - when parents submit applications through your public form, you can review and accept them, which automatically creates the student record.',
          tags: ['students', 'add', 'import']
        },
        {
          question: 'Why can\'t I add students?',
          answer: 'You must first: 1) Set a billing day in Settings → Payment Methods (required), 2) Add a platform payment method in Settings → Your Subscription (required). Once both are complete, you\'ll be able to add students.',
          tags: ['students', 'billing day', 'requirements']
        },
        {
          question: 'How do I bulk import students?',
          answer: 'Go to the Students page and click "Bulk Upload". Download the template CSV file, fill in student information (name, date of birth, parent email/phone, class, start month), then upload it. The system will validate the data and show you a preview before final import. Duplicate detection is automatic.',
          tags: ['students', 'bulk', 'csv', 'import']
        },
        {
          question: 'How do applications work?',
          answer: 'Parents can submit applications through your public application form. You\'ll see these in the Applications page. Review the application details, then either Accept (creates student and parent account automatically) or Reject (with optional admin notes). When you accept, the student is enrolled in their preferred class if available.',
          tags: ['applications', 'enrollment', 'parents']
        },
        {
          question: 'How do I mark attendance?',
          answer: 'Go to the Attendance page, select a class and date, then mark each student as Present, Late, or Absent. You can mark entire classes at once or individual students. Attendance history is available for any date range, and parents can see their children\'s attendance in their portal.',
          tags: ['attendance', 'classes', 'tracking']
        }
      ]
    },
    {
      id: 'billing-payments',
      title: 'Billing & Payments',
      icon: CreditCard,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      questions: [
        {
          question: 'What is a billing day and why is it important?',
          answer: 'The billing day (1-28) is the day of the month when: automatic card payments are processed for parents with saved cards, monthly invoices are due, and payment status (LATE/OVERDUE) is calculated. You must set this in Settings → Payment Methods before adding students. Choose a day that works for your cash flow and when parents typically have funds available.',
          tags: ['billing day', 'payments', 'automatic']
        },
        {
          question: 'How do automatic card payments work?',
          answer: 'Parents can save their card details in their account. On your billing day each month, the system automatically charges their card for all pending fees. If a payment fails, it\'s marked as FAILED and the parent is notified. Parents can enable or disable auto-pay in their account settings.',
          tags: ['automatic', 'card', 'payments', 'stripe']
        },
        {
          question: 'What payment methods can parents use?',
          answer: 'You can enable multiple payment methods: Card Payments (via Stripe Connect - automatic), Cash Payments (you record manually), and Bank Transfer (you record manually). Configure these in Settings → Payment Methods. For bank transfers, add your bank account details and payment instructions.',
          tags: ['payment methods', 'cash', 'bank transfer', 'card']
        },
        {
          question: 'How are invoices generated?',
          answer: 'Invoices are automatically created when students are enrolled in classes (monthly class fees). You can also create invoices manually from the Payments page. Invoice due dates are calculated based on your billing day. Payment status (PENDING, LATE, OVERDUE) is automatically calculated based on the due date.',
          tags: ['invoices', 'billing', 'automatic']
        },
        {
          question: 'How do I record cash or bank transfer payments?',
          answer: 'Go to the Payments page, find the invoice you want to mark as paid, and click "Record Payment". Select the payment method (Cash or Bank Transfer), enter any reference numbers, and save. The invoice will be marked as PAID and the payment will appear in your payment records.',
          tags: ['payments', 'cash', 'bank transfer', 'manual']
        },
        {
          question: 'What does payment status mean?',
          answer: 'PENDING: Not yet due or recently due (less than 48 hours past due). LATE: 48-96 hours (2-4 days) past the due date. OVERDUE: More than 96 hours (4+ days) past the due date. PAID: Payment has been received. Status is automatically calculated based on your billing day and current date.',
          tags: ['payment status', 'overdue', 'late', 'pending']
        },
        {
          question: 'How much does the platform cost?',
          answer: 'The platform costs £2 per active student per month. You get a 30-day free trial when you first sign up. After the trial, you\'re automatically charged monthly on your billing anniversary date (the day of the month you signed up). Only non-archived students count toward your bill.',
          tags: ['pricing', 'subscription', 'cost']
        }
      ]
    },
    {
      id: 'classes-teachers',
      title: 'Classes & Teachers',
      icon: Users,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      questions: [
        {
          question: 'How do I create a class?',
          answer: 'Go to the Classes page and click "Add Class". Enter the class name, assign a teacher, set the monthly fee in pounds (e.g., type 50 for £50.00), and configure the schedule (days and times). The schedule is used for calendar display, attendance marking, and parent notifications. You can also use decimals (e.g., 50.50 for £50.50).',
          tags: ['classes', 'create', 'schedule']
        },
        {
          question: 'How do I enroll students in classes?',
          answer: 'Go to the class detail page and click "Enroll Students". Select the students you want to add. Students are immediately enrolled and will be charged the class fee monthly. You can also enroll students when creating or editing their profile.',
          tags: ['classes', 'enrollment', 'students']
        },
        {
          question: 'What are the different staff roles?',
          answer: 'Admin Subrole: Full access to all features, can manage settings and other staff. Teacher: Access to assigned classes, can mark attendance, view student records for their classes, send messages, view calendar. Finance Officer: Access to financial data only (invoices, payments, fees), cannot access other features.',
          tags: ['staff', 'roles', 'permissions']
        },
        {
          question: 'How do I add staff members?',
          answer: 'Go to the Staff page and click "Add Staff Member". Enter their name, email (must be unique), phone number, and select their role/subrole. They\'ll receive an invitation email to create their account. Once they sign up, you can assign specific permissions to control their access.',
          tags: ['staff', 'teachers', 'permissions']
        }
      ]
    },
    {
      id: 'communication',
      title: 'Communication',
      icon: MessageSquare,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      questions: [
        {
          question: 'How do I send messages to parents?',
          answer: 'Go to the Messages page and click "Create Message". Choose your audience (All Parents, By Class, or Individual), write your message, and select channels (Email, WhatsApp, or both). You can save as draft to send later, or send immediately. Messages sent via email are delivered automatically, while WhatsApp messages are prepared for you to copy and send manually.',
          tags: ['messages', 'announcements', 'email', 'whatsapp']
        },
        {
          question: 'Can I send messages to specific classes?',
          answer: 'Yes! When creating a message, select "By Class" as the audience type, then choose which classes to send to. This is useful for class-specific announcements, homework reminders, or event notifications.',
          tags: ['messages', 'classes', 'targeted']
        },
        {
          question: 'How does WhatsApp messaging work?',
          answer: 'When you create a WhatsApp message, the system prepares the message text for you to copy. You then send it manually through your WhatsApp Business account. This allows you to use WhatsApp for communication while maintaining control over when messages are sent.',
          tags: ['whatsapp', 'messaging', 'communication']
        }
      ]
    },
    {
      id: 'calendar',
      title: 'Calendar & Events',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      questions: [
        {
          question: 'How do I add events to the calendar?',
          answer: 'Go to the Calendar page and click "Add Event". Select the event type (Holiday, Exam, Meeting, etc.), enter the title, date, time, and description. For exams, you can link them to specific classes. Events are visible to parents in their portal calendar.',
          tags: ['calendar', 'events', 'holidays']
        },
        {
          question: 'Can parents see the calendar?',
          answer: 'Yes, parents can view the calendar in their portal. They see classes (based on their children\'s enrollments), holidays, exams, and other events. They can also export the calendar as an ICS file to import into their personal calendar apps.',
          tags: ['calendar', 'parents', 'export']
        },
        {
          question: 'How do class schedules appear on the calendar?',
          answer: 'Class schedules are automatically added to the calendar based on the days and times you set when creating the class. Parents see these as recurring events for their children\'s classes.',
          tags: ['calendar', 'classes', 'schedule']
        }
      ]
    },
    {
      id: 'gift-aid',
      title: 'Gift Aid',
      icon: DollarSign,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      questions: [
        {
          question: 'What is Gift Aid?',
          answer: 'Gift Aid is a UK tax relief scheme that allows charities (including madrasahs) to claim back 25% extra on eligible payments from UK taxpayers. Parents must declare their eligibility and consent for you to claim Gift Aid on their payments.',
          tags: ['gift aid', 'tax', 'uk']
        },
        {
          question: 'How do parents declare Gift Aid?',
          answer: 'Parents can declare their Gift Aid status in their portal (YES, NO, or NOT_SURE). You can also update their status from the Gift Aid page. Only parents who declare YES are included in HMRC export files.',
          tags: ['gift aid', 'parents', 'declaration']
        },
        {
          question: 'How do I export Gift Aid data for HMRC?',
          answer: 'Go to the Gift Aid page, select the date range for your claim period, and click "Export CSV". The file includes parent details, payment amounts, and dates for all parents who have declared YES. Use this file for your HMRC submission.',
          tags: ['gift aid', 'export', 'hmrc', 'csv']
        },
        {
          question: 'Can I send reminders to parents about Gift Aid?',
          answer: 'Yes! On the Gift Aid page, you can filter parents by status (NOT_SURE or NO) and click "Send Reminders". This sends them a message encouraging them to update their Gift Aid declaration.',
          tags: ['gift aid', 'reminders', 'parents']
        }
      ]
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      icon: FileText,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      questions: [
        {
          question: 'What reports can I generate?',
          answer: 'You can generate attendance reports (by class, date range, or student), financial reports (revenue, payments, outstanding balances), and student reports (enrollment lists, class rosters). Use the Quick Add menu → Generate Report to create reports, or export data directly from various pages.',
          tags: ['reports', 'export', 'analytics']
        },
        {
          question: 'How do I view financial analytics?',
          answer: 'Go to the Finances page to see total revenue, pending invoices, overdue amounts, payment success rate, revenue trends chart, and payment method breakdown. All data is real-time and pulled directly from your invoices and payments.',
          tags: ['finances', 'analytics', 'revenue']
        },
        {
          question: 'Can I export data?',
          answer: 'Yes! You can export attendance records, student lists, payment records, Gift Aid data, and financial reports. Most exports are available as CSV files for easy analysis in spreadsheet applications.',
          tags: ['export', 'csv', 'data']
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Support',
      icon: Settings,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      questions: [
        {
          question: 'What browsers are supported?',
          answer: 'Madrasah OS works on all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version for the best experience and security.',
          tags: ['browser', 'compatibility', 'technical']
        },
        {
          question: 'Is my data secure?',
          answer: 'Yes, we use enterprise-grade security including SSL encryption, secure data centers, regular backups, and strict access controls. Your data is never shared with third parties except for necessary service providers (like Stripe for payments) who are bound by strict privacy agreements.',
          tags: ['security', 'privacy', 'data']
        },
        {
          question: 'What if I forget my password?',
          answer: 'Use the "Forgot Password" link on the login page. You\'ll receive an email with a secure link to reset your password. The link expires after a short time for security.',
          tags: ['password', 'login', 'security']
        },
        {
          question: 'How do I update my profile?',
          answer: 'Go to Settings → Profile to update your name, email, phone number, and enable two-factor authentication. Changes to your email require verification for security.',
          tags: ['profile', 'settings', 'account']
        },
        {
          question: 'Can I change my organisation settings?',
          answer: 'Yes, go to Settings → Organisation to update your madrasah name, address, contact information, office hours, and timezone. Only admins can change organisation settings.',
          tags: ['settings', 'organisation', 'admin']
        }
      ]
    }
  ]

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(faq => 
      faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      faq.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )
  })).filter(category => category.questions.length > 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link href="/support">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Support
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Frequently Asked Questions</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Find answers to common questions about Madrasah OS
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted-foreground)] h-4 w-4" />
        <Input
          placeholder="Search FAQ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* FAQ Categories */}
      <div className="space-y-8">
        {filteredCategories.map((category) => {
          const IconComponent = category.icon
          return (
            <div key={category.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${category.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className={`h-5 w-5 ${category.color}`} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">{category.title}</h2>
                </div>
              </div>
              
              <div className="space-y-3">
                {category.questions.map((faq, index) => {
                  const itemId = `${category.id}-${index}`
                  const isExpanded = expandedItems.has(itemId)
                  
                  return (
                    <Card 
                      key={index} 
                      className={`p-4 border-[var(--border)] hover:shadow-md transition-all ${isExpanded ? category.borderColor : ''}`}
                    >
                      <div className="space-y-3">
                        <div 
                          className="flex items-start justify-between cursor-pointer group"
                          onClick={() => toggleExpanded(itemId)}
                        >
                          <h3 className="font-medium text-[var(--foreground)] pr-4 flex-1 group-hover:text-[var(--foreground)] transition-colors">{faq.question}</h3>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="p-1 h-auto flex-shrink-0 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                            onClick={(e) => {
                              e.stopPropagation()
                              toggleExpanded(itemId)
                            }}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        
                        {isExpanded && (
                          <div className="space-y-3 pt-2 border-t border-[var(--border)]">
                            <p className="text-sm text-[var(--foreground)] leading-relaxed">{faq.answer}</p>
                            <div className="flex flex-wrap gap-2">
                              {faq.tags.map((tag) => (
                                <Badge 
                                  key={tag} 
                                  variant="secondary" 
                                  className={`text-xs ${category.bgColor} ${category.color} border ${category.borderColor}`}
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Still need help? */}
      <Card className={`p-6 bg-emerald-50 border-emerald-200`}>
        <div className="text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-emerald-900 mb-2">Still need help?</h3>
          <p className="text-emerald-700 mb-4">
            Can't find the answer you're looking for? Our support team is here to help.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/support">
              <Button variant="outline" className="border-emerald-300 text-emerald-700 hover:bg-emerald-100">
                Contact Support
              </Button>
            </Link>
            <Link href="/support">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Create Support Ticket
              </Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
