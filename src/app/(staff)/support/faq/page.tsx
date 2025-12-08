'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
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
      icon: '🚀',
      questions: [
        {
          question: 'How do I set up my madrasah on Madrasah OS?',
          answer: 'To set up your madrasah, start by configuring your organisation settings, adding your first class, and inviting teachers. Then you can begin adding students and setting up your fee structure. Check our Getting Started guide for detailed steps.',
          tags: ['setup', 'organisation']
        },
        {
          question: 'What information do I need to provide during setup?',
          answer: 'You\'ll need your madrasah name, address, contact information, timezone, and basic settings like academic year structure. You can always update these details later in your organisation settings.',
          tags: ['setup', 'organisation']
        },
        {
          question: 'How do I invite teachers to join my madrasah?',
          answer: 'Go to the Teachers section and click "Add Teacher". Enter their email address and they\'ll receive an invitation to join your madrasah. They can then create their account and start teaching.',
          tags: ['teachers', 'invitations']
        }
      ]
    },
    {
      id: 'student-management',
      title: 'Student Management',
      icon: '👥',
      questions: [
        {
          question: 'How do I add students to my madrasah?',
          answer: 'You can add students individually through the Students page, or bulk import them using a CSV file. For bulk import, prepare a CSV with student names, dates of birth, and parent contact information.',
          tags: ['students', 'import']
        },
        {
          question: 'Can parents add their own children?',
          answer: 'Yes! Parents can submit applications for their children through the public application form. You can then review and approve these applications from your Applications page.',
          tags: ['applications', 'parents']
        },
        {
          question: 'How do I mark attendance?',
          answer: 'Go to the Attendance page, select the class and date, then mark each student as Present, Absent, or Late. You can also mark attendance for multiple classes at once.',
          tags: ['attendance', 'classes']
        },
        {
          question: 'How do I record student progress?',
          answer: 'Use the Progress Logs feature to record academic achievements, memorization progress, or any other notes about student development. These logs are visible to parents.',
          tags: ['progress', 'academic']
        }
      ]
    },
    {
      id: 'billing-payments',
      title: 'Billing & Payments',
      icon: '💳',
      questions: [
        {
          question: 'How do I set up fees for my classes?',
          answer: 'Create fee plans in the Fees section. You can set different amounts for different classes, choose between monthly or termly billing, and set up automatic invoice generation.',
          tags: ['fees', 'billing']
        },
        {
          question: 'How do parents pay their fees?',
          answer: 'Parents can pay online through their portal using credit/debit cards, or you can record cash payments manually. Online payments are processed securely through Stripe.',
          tags: ['payments', 'online']
        },
        {
          question: 'What payment methods do you support?',
          answer: 'We support all major credit and debit cards through Stripe. Parents can also set up automatic payments to avoid missing due dates.',
          tags: ['payments', 'stripe']
        },
        {
          question: 'How do I generate invoices?',
          answer: 'Invoices are automatically generated based on your fee plans and student enrollments. You can also generate them manually or in bulk from the Invoices section.',
          tags: ['invoices', 'billing']
        }
      ]
    },
    {
      id: 'communication',
      title: 'Communication',
      icon: '📱',
      questions: [
        {
          question: 'How do I send announcements to parents?',
          answer: 'Use the Messages section to compose and send announcements via email or WhatsApp. You can target specific parents or send to all parents at once.',
          tags: ['messages', 'announcements']
        },
        {
          question: 'How do I set up WhatsApp messaging?',
          answer: 'Connect your WhatsApp Business account through the Integrations section. Once connected, you can send messages and receive delivery confirmations.',
          tags: ['whatsapp', 'integration']
        },
        {
          question: 'Can parents reply to messages?',
          answer: 'Yes, parents can reply to WhatsApp messages directly. Email replies will be sent to your organisation\'s email address.',
          tags: ['communication', 'replies']
        }
      ]
    },
    {
      id: 'technical',
      title: 'Technical Support',
      icon: '🔧',
      questions: [
        {
          question: 'What browsers are supported?',
          answer: 'Madrasah OS works on all modern browsers including Chrome, Firefox, Safari, and Edge. We recommend using the latest version for the best experience.',
          tags: ['browser', 'compatibility']
        },
        {
          question: 'Is my data secure?',
          answer: 'Yes, we use enterprise-grade security including SSL encryption, secure data centers, and regular backups. Your data is never shared with third parties.',
          tags: ['security', 'privacy']
        },
        {
          question: 'Can I export my data?',
          answer: 'Yes, you can export student data, attendance records, and financial reports in CSV format. Contact support for assistance with data exports.',
          tags: ['export', 'data']
        },
        {
          question: 'What if I forget my password?',
          answer: 'Use the "Forgot Password" link on the login page. You\'ll receive an email with instructions to reset your password.',
          tags: ['password', 'login']
        }
      ]
    }
  ]

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
          <p className="mt-1 text-sm text-gray-500">
            Find answers to common questions about Madrasah OS
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search FAQ..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* FAQ Categories */}
      <div className="space-y-6">
        {faqCategories.map((category) => (
          <div key={category.id} className="space-y-4">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{category.icon}</span>
              <h2 className="text-xl font-semibold text-gray-900">{category.title}</h2>
            </div>
            
            <div className="space-y-3">
              {category.questions.map((faq, index) => {
                const itemId = `${category.id}-${index}`
                const isExpanded = expandedItems.has(itemId)
                
                return (
                  <Card key={index} className="p-4">
                    <div className="space-y-3">
                      <div 
                        className="flex items-start justify-between cursor-pointer"
                        onClick={() => toggleExpanded(itemId)}
                      >
                        <h3 className="font-medium text-gray-900 pr-4 flex-1">{faq.question}</h3>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="p-1 h-auto flex-shrink-0"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleExpanded(itemId)
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      
                      {isExpanded && (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">{faq.answer}</p>
                          <div className="flex flex-wrap gap-2">
                            {faq.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
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
        ))}
      </div>

      {/* Still need help? */}
      <Card className="p-6 bg-gray-50 border-gray-200">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Still need help?</h3>
          <p className="text-gray-600 mb-4">
            Can't find the answer you're looking for? Our support team is here to help.
          </p>
          <div className="flex justify-center space-x-4">
            <Button variant="outline">
              Contact Support
            </Button>
            <Button>
              Create Support Ticket
            </Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
