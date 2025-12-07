'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { 
  X as CloseIcon,
  Loader2,
  Mail,
  Send,
  Eye,
  Edit,
} from 'lucide-react'
import { toast } from 'sonner'
import { generateEmailTemplate } from '@/lib/email-template'

interface Lead {
  id: string
  orgName: string
  contactName: string | null
  contactEmail: string | null
  lastEmailStage: string | null
  emailOutreachCompleted: boolean
}

interface LeadEmailComposerModalProps {
  isOpen: boolean
  onClose: () => void
  onSent: () => void
  lead: Lead | null
  ownerName?: string
  calendlyUrl?: string | null
}

const EMAIL_TEMPLATES = {
  INITIAL: {
    subject: 'Management system for [Madrasah Name]',
    body: `Assalamu Alaikum [Contact Name],

I hope this message finds you well.

I'm reaching out from Madrasah OS. We help madrasahs manage students, track attendance, handle payments, and communicate with parents—all in one system.

I noticed [Madrasah Name] and thought you might find our platform useful. Many madrasahs have found it helps them save time on administrative tasks.

Our best features:

📋 Student Management
Complete student records, enrollment & tracking

✅ Attendance Tracking
Quick daily marking with automated reports

💳 Payment Management
Track fees, invoices & payment history

💬 Parent Communication
Send messages, announcements & updates

📊 Reports & Analytics
Insights on attendance, payments & performance

📅 Calendar & Events
Manage holidays, events & schedules

Would you be open to a brief conversation? I'd be happy to show you how it works and answer any questions.

[Calendly Link]`
  },
  FOLLOW_UP_1: {
    subject: 'Following up: Management system for [Madrasah Name]',
    body: `Assalamu Alaikum [Contact Name],

I hope this message finds you well.

I wanted to follow up on my previous message about Madrasah OS and how it could benefit [Madrasah Name].

I understand you're busy, so I'll keep this brief. Our platform helps madrasahs:

📋 Student Management
Complete student records, enrollment & tracking

✅ Attendance Tracking
Quick daily marking with automated reports

💳 Payment Management
Track fees, invoices & payment history

💬 Parent Communication
Send messages, announcements & updates

📊 Reports & Analytics
Insights on attendance, payments & performance

📅 Calendar & Events
Manage holidays, events & schedules

If you're interested, I'd be happy to show you how it works and answer any questions.

[Calendly Link]

Looking forward to hearing from you.`
  },
  FOLLOW_UP_2: {
    subject: 'One more follow-up: Management system for [Madrasah Name]',
    body: `Assalamu Alaikum [Contact Name],

I hope you're well.

I wanted to reach out one more time about Madrasah OS for [Madrasah Name].

I know you're busy, but I believe our platform could genuinely help streamline your operations. Many madrasahs have found it helps them save time on administrative tasks.

If you're interested, I'm here to help. If not, I completely understand and won't trouble you further.

[Calendly Link]`
  },
  FINAL: {
    subject: 'Final follow-up: Management system for [Madrasah Name]',
    body: `Assalamu Alaikum [Contact Name],

I hope this message finds you well.

This will be my final follow-up regarding Madrasah OS for [Madrasah Name].

I wanted to make sure you had all the information you needed. If you're interested in learning more, please don't hesitate to reach out.

[Calendly Link]

Thank you for your time.

JazakAllah Khair,

[Your Name]
Madrasah OS`
  },
  CUSTOM: {
    subject: '',
    body: ''
  }
}

export function LeadEmailComposerModal({ 
  isOpen, 
  onClose, 
  onSent, 
  lead,
  ownerName = 'Madrasah OS',
  calendlyUrl: propCalendlyUrl = null
}: LeadEmailComposerModalProps) {
  const [calendlyUrl, setCalendlyUrl] = useState<string | null>(propCalendlyUrl)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [template, setTemplate] = useState<string>('INITIAL')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string>('')
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false)

  // Fetch Calendly URL from platform settings if not provided
  useEffect(() => {
    if (isOpen && !propCalendlyUrl) {
      fetch('/api/owner/settings')
        .then(res => res.json())
        .then(data => {
          if (data.ownerCalendlyUrl) {
            setCalendlyUrl(data.ownerCalendlyUrl)
          }
        })
        .catch(() => {
          // Silently fail
        })
    }
  }, [isOpen, propCalendlyUrl])

  useEffect(() => {
    if (isOpen && lead) {
      // Determine default template based on lastEmailStage
      // Only allow sending the next template in sequence
      let defaultTemplate = 'INITIAL'
      if (lead.lastEmailStage === 'INITIAL') {
        defaultTemplate = 'FOLLOW_UP_1'
      } else if (lead.lastEmailStage === 'FOLLOW_UP_1') {
        defaultTemplate = 'FOLLOW_UP_2'
      } else if (lead.lastEmailStage === 'FOLLOW_UP_2') {
        defaultTemplate = 'FINAL'
      } else if (lead.lastEmailStage === 'FINAL' || lead.emailOutreachCompleted) {
        // If final email was sent, default to CUSTOM only
        defaultTemplate = 'CUSTOM'
      }
      
      setTemplate(defaultTemplate)
      updateTemplateContent(defaultTemplate)
    }
  }, [isOpen, lead])

  // Check if a template has already been sent
  const hasTemplateBeenSent = (templateKey: string): boolean => {
    if (!lead || !lead.lastEmailStage) return false
    
    const stageOrder = ['INITIAL', 'FOLLOW_UP_1', 'FOLLOW_UP_2', 'FINAL']
    const currentStageIndex = stageOrder.indexOf(lead.lastEmailStage)
    const templateIndex = stageOrder.indexOf(templateKey)
    
    // If template is in the sequence and has been sent (current stage is at or past it)
    if (templateIndex !== -1 && currentStageIndex >= templateIndex) {
      return true
    }
    
    return false
  }

  const updateTemplateContent = (templateKey: string) => {
    if (!lead) return

    const selectedTemplate = EMAIL_TEMPLATES[templateKey as keyof typeof EMAIL_TEMPLATES]
    if (!selectedTemplate) return

    let templateSubject = selectedTemplate.subject
    let templateBody = selectedTemplate.body

    // Replace placeholders
    templateSubject = templateSubject.replace('[Madrasah Name]', lead.orgName)
    templateBody = templateBody.replace(/\[Madrasah Name\]/g, lead.orgName)
    templateBody = templateBody.replace(/\[Contact Name\]/g, lead.contactName || 'there')
    templateBody = templateBody.replace(/\[Your Name\]/g, ownerName)

    // Handle Calendly link
    if (calendlyUrl) {
      templateBody = templateBody.replace(/\[Calendly Link\]/g, `You can book a convenient time here: ${calendlyUrl}`)
    } else {
      templateBody = templateBody.replace(/\[Calendly Link\]/g, '')
    }

    setSubject(templateSubject)
    setBody(templateBody)
    // Generate preview for the template
    generatePreview(templateSubject, templateBody)
  }

  const generatePreview = async (previewSubject: string, previewBody: string) => {
    if (!previewSubject || !previewBody) {
      setPreviewHtml('')
      return
    }

    setIsGeneratingPreview(true)
    try {
      // Extract features from email body if present
      const featuresMatch = previewBody.match(/Our best features:([\s\S]*?)(?=\n\n|$)/)
      let features: Array<{ icon: string; title: string; description: string }> | undefined
      let bodyWithoutFeatures = previewBody

      if (featuresMatch) {
        const featuresText = featuresMatch[1]
        const featureLines = featuresText.split('\n').filter(line => line.trim())
        
        features = []
        for (let i = 0; i < featureLines.length; i += 2) {
          const titleLine = featureLines[i]?.trim()
          const descLine = featureLines[i + 1]?.trim()
          
          if (titleLine && descLine) {
            // Extract icon (emoji) and title
            const iconMatch = titleLine.match(/^([^\s]+)\s+(.+)$/)
            if (iconMatch) {
              features.push({
                icon: iconMatch[1],
                title: iconMatch[2],
                description: descLine
              })
            }
          }
        }
        
        // Remove features section from body
        bodyWithoutFeatures = previewBody.replace(/Our best features:[\s\S]*?(?=\n\n|$)/, '').trim()
      }

      const html = await generateEmailTemplate({
        title: previewSubject,
        description: bodyWithoutFeatures.replace(/\n/g, '<br>'),
        features: features,
        calendlyUrl: calendlyUrl,
        footerText: `Best regards,<br>${ownerName}<br>Madrasah OS`
      })
      
      // Replace absolute logo URLs with relative paths for preview
      const processedHtml = html.replace(
        /https?:\/\/[^"']+\/madrasah-logo\.png/g,
        '/madrasah-logo.png'
      ).replace(
        /src="https?:\/\/[^"']+"/g,
        (match) => {
          if (match.includes('madrasah-logo')) {
            return 'src="/madrasah-logo.png"'
          }
          return match
        }
      )
      
      setPreviewHtml(processedHtml)
    } catch (error) {
      console.error('Error generating preview:', error)
      setPreviewHtml('<p style="color: #ef4444; padding: 20px;">Error generating preview. Please check your email content.</p>')
    } finally {
      setIsGeneratingPreview(false)
    }
  }

  // Update preview when subject or body changes
  useEffect(() => {
    if (subject && body) {
      generatePreview(subject, body)
    } else {
      setPreviewHtml('')
    }
  }, [subject, body, ownerName])

  const handleTemplateChange = (value: string) => {
    // Prevent selecting templates that have already been sent
    if (value !== 'CUSTOM' && hasTemplateBeenSent(value)) {
      toast.error('This template has already been sent. Please select a different template.')
      return
    }
    setTemplate(value)
    updateTemplateContent(value)
  }

  const handleSend = async () => {
    if (!lead || !lead.contactEmail) {
      toast.error('No email address available for this lead')
      return
    }

    if (!subject.trim() || !body.trim()) {
      toast.error('Please fill in both subject and body')
      return
    }

    // Prevent sending templates that have already been sent
    if (template !== 'CUSTOM' && hasTemplateBeenSent(template)) {
      toast.error(`This template has already been sent. Please select a different template or use "Custom email".`)
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/owner/leads/${lead.id}/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          template: template,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to send email')
      }

      toast.success('Email sent successfully')
      onSent()
      handleClose()
    } catch (error: any) {
      console.error('Error sending email:', error)
      toast.error(error.message || 'Failed to send email')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setSubject('')
    setBody('')
    setTemplate('INITIAL')
    setIsSubmitting(false)
    onClose()
  }

  if (!lead || !lead.contactEmail) {
    return null
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={handleClose}
      title="Compose Email"
    >
      <div className="space-y-6">
        {/* Lead Info */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <div className="text-sm">
            <span className="font-medium">To:</span> {lead.contactEmail}
            {lead.contactName && (
              <>
                {' '}
                <span className="text-muted-foreground">({lead.contactName})</span>
              </>
            )}
          </div>
          <div className="text-sm mt-1">
            <span className="font-medium">Madrasah:</span> {lead.orgName}
          </div>
        </div>

        {/* Template Selector */}
        <div className="space-y-2">
          <Label>Email Template</Label>
          <Select value={template} onValueChange={handleTemplateChange}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem 
                value="INITIAL"
                disabled={hasTemplateBeenSent('INITIAL')}
              >
                Initial outreach {hasTemplateBeenSent('INITIAL') && '(Already sent)'}
              </SelectItem>
              <SelectItem 
                value="FOLLOW_UP_1"
                disabled={hasTemplateBeenSent('FOLLOW_UP_1')}
              >
                Follow-up email {hasTemplateBeenSent('FOLLOW_UP_1') && '(Already sent)'}
              </SelectItem>
              <SelectItem 
                value="FOLLOW_UP_2"
                disabled={hasTemplateBeenSent('FOLLOW_UP_2')}
              >
                Second follow-up {hasTemplateBeenSent('FOLLOW_UP_2') && '(Already sent)'}
              </SelectItem>
              <SelectItem 
                value="FINAL"
                disabled={hasTemplateBeenSent('FINAL')}
              >
                Final follow-up {hasTemplateBeenSent('FINAL') && '(Already sent)'}
              </SelectItem>
              <SelectItem value="CUSTOM">Custom email</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {lead.emailOutreachCompleted 
              ? 'Email outreach sequence complete. Use "Custom email" for additional communication.'
              : 'Select a template or choose "Custom" to write your own. Templates already sent are disabled.'}
          </p>
        </div>

        {/* Subject */}
        <div className="space-y-2">
          <Label htmlFor="subject">
            Subject <span className="text-red-500">*</span>
          </Label>
          <Input
            id="subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Email subject"
            required
          />
        </div>

        {/* Body / Preview Toggle */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="body">
              Message <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={!showPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPreview(false)}
                className="h-8"
              >
                <Edit className="h-3 w-3 mr-1" />
                Edit
              </Button>
              <Button
                type="button"
                variant={showPreview ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPreview(true)}
                className="h-8"
              >
                <Eye className="h-3 w-3 mr-1" />
                Preview
              </Button>
            </div>
          </div>
          
          {!showPreview ? (
            <Textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Email body"
              rows={12}
              required
              className="font-mono text-sm"
            />
          ) : (
            <div className="border border-[var(--border)] rounded-lg overflow-hidden bg-white">
              <div className="p-4 bg-[var(--muted)] border-b border-[var(--border)]">
                <div className="text-xs text-[var(--muted-foreground)]">
                  <div><strong>To:</strong> {lead.contactEmail}</div>
                  <div className="mt-1"><strong>Subject:</strong> {subject || '(No subject)'}</div>
                </div>
              </div>
              <div 
                className="p-4 overflow-auto max-h-[400px] bg-white"
                style={{ minHeight: '300px' }}
                dangerouslySetInnerHTML={{ __html: previewHtml || '<p class="text-muted-foreground">Preview will appear here...</p>' }}
              />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            <CloseIcon className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={isSubmitting || !subject.trim() || !body.trim()}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Email
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

