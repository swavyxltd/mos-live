'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, BookOpen, Video, HelpCircle, ArrowLeft, X, Users, GraduationCap, CreditCard, Calendar, MessageSquare, FileText, Settings, BarChart3, ClipboardList, DollarSign, Gift, Bell } from 'lucide-react'
import Link from 'next/link'
import { sanitizeHtml } from '@/lib/input-validation'

export default function DocumentationPage() {
  const [selectedArticle, setSelectedArticle] = useState<any>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const documentationSections = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      description: 'Learn the basics and set up your madrasah',
      icon: BookOpen,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      borderColor: 'border-emerald-200',
      articles: [
        {
          title: 'Welcome to Madrasah OS',
          description: 'An introduction to the platform and its key features',
          readTime: '5 min read',
          content: `# Welcome to Madrasah OS

Madrasah OS is a comprehensive management system designed specifically for Islamic schools and madrasahs. Our platform helps you manage every aspect of your educational institution, from student enrollment to fee collection and parent communication.

## Key Features

### 📊 Dashboard Overview
Your dashboard provides real-time insights into your madrasah's performance:
- **Total Students**: Track active enrollments and growth trends
- **Monthly Revenue**: Monitor recurring revenue and payment trends  
- **Attendance Rate**: View weekly attendance percentages
- **Active Classes**: See currently running classes and teacher assignments
- **Pending Applications**: Track new student applications requiring review
- **Overdue Payments**: Monitor past due amounts needing attention

### 🎯 Quick Actions
- **Quick Add Menu**: Instantly add students, classes, teachers, or events
- **Generate Reports**: Create attendance, financial, or student reports
- **Recent Activity**: Track latest enrollments, payments, and attendance

### 📈 Performance Metrics
- **Top Performing Classes**: View classes with highest attendance rates
- **Recent Activity Feed**: Monitor new enrollments, payments, and activities
- **Today's Tasks**: See what needs your attention right now

## Getting Started Checklist

1. ✅ Complete onboarding setup (admin profile, organisation details, payment methods)
2. ✅ Set your billing day in Payment Methods settings (required before adding students)
3. ✅ Create your first class
4. ✅ Add teachers to your madrasah
5. ✅ Set up fee plans
6. ✅ Accept applications or add students directly
7. ✅ Configure attendance tracking
8. ✅ Set up communication channels

## Next Steps

Once you're familiar with the dashboard, explore these key areas:
- **Classes**: Create and manage your educational programs
- **Students**: Add and track student information
- **Applications**: Review and accept new student applications
- **Attendance**: Mark and monitor student attendance
- **Payments**: Manage invoices and track revenue
- **Messages**: Communicate with parents and staff
- **Settings**: Configure your organisation settings`
        },
        {
          title: 'Setting Up Your Organisation',
          description: 'Configure your madrasah settings and preferences',
          readTime: '10 min read',
          content: `# Setting Up Your Organisation

Properly configuring your organisation settings is crucial for the smooth operation of your madrasah. This guide will walk you through all the essential settings.

## Initial Setup

### Onboarding Process
When you first sign up, you'll go through a guided onboarding process:

1. **Admin Profile**: Enter your name, email, and phone number
2. **Organisation Details**: Add your madrasah's address, contact information, and office hours
3. **Payment Methods**: Configure payment acceptance methods and set your billing day

### Billing Day Configuration
**Important**: You must set a billing day (1-28) before you can add students. This is when:
- Automatic card payments are processed for parents
- Monthly invoices are generated
- Payment due dates are calculated

To set your billing day:
1. Go to **Settings** → **Payment Methods**
2. Enter a day between 1 and 28
3. Click **Save Billing Day**

## Organisation Profile

### Basic Information
- **Madrasah Name**: Your official institution name
- **Address**: Complete physical address for correspondence
- **Contact Information**: Phone numbers and email addresses (internal and public)
- **Timezone**: Set your local timezone for accurate scheduling
- **Office Hours**: Define when your office is open

### Payment Settings
- **Payment Methods**: Choose which payment methods to accept (Card, Cash, Bank Transfer)
- **Billing Day**: Day of month when fees are due (1-28, required)
- **Bank Details**: If accepting bank transfers, add your bank account information
- **Payment Instructions**: Custom instructions for parents

## Platform Subscription

### Payment Method Setup
Before you can add students or use most features, you must:
1. Add a payment method in **Settings** → **Your Subscription**
2. This enables your 30-day free trial
3. After trial, you'll be charged £1 per active student monthly

### Subscription Management
- View your current subscription status
- See next payment date and amount
- Update payment method
- View billing history

## User Roles & Permissions

### Admin
- Full system access and configuration rights
- Can manage all settings and staff
- Required to set billing day and payment methods

### Staff Roles
- **Teacher**: Access to assigned classes, attendance, and student records
- **Finance Officer**: Access to financial data (invoices, payments, fees)
- **Admin Subrole**: Full access like Admin role

### Parent
- Access to their children's information only
- Can view invoices, make payments, and see attendance
- Can update their own profile and payment methods

## Next Steps

After completing setup:
- Create your first class
- Add staff members
- Set up fee plans
- Start accepting applications or adding students`
        }
      ]
    },
    {
      id: 'student-management',
      title: 'Student Management',
      description: 'Manage students, applications, and enrollments',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      articles: [
        {
          title: 'Adding Students',
          description: 'Learn how to add students individually or in bulk',
          readTime: '8 min read',
          content: `# Adding Students

You can add students to your madrasah in several ways. **Important**: You must have set a billing day in Settings → Payment Methods before adding students.

## Individual Student Entry

### Quick Add
1. Click the **Quick Add** button (top right)
2. Select **Add Student**
3. Fill in the required information:
   - First Name and Last Name
   - Date of Birth
   - Parent Email (optional - will send invitation)
   - Class assignment
   - Start Month
   - Status (Active or Archived)

### From Students Page
1. Navigate to **Students** in the sidebar
2. Click **Add Student** button
3. Complete the student form
4. Click **Save**

## Bulk Upload

### CSV Import
1. Go to **Students** page
2. Click **Bulk Upload** button
3. Download the template CSV file
4. Fill in student data:
   - First Name, Last Name
   - Date of Birth (YYYY-MM-DD format)
   - Parent Email (optional)
   - Parent Phone (optional)
   - Class Name
   - Start Month (YYYY-MM format)
5. Upload the CSV file
6. Review and confirm the import

### Bulk Upload Features
- Automatic duplicate detection
- Validation of all data fields
- Preview before final import
- Error reporting for invalid rows

## From Applications

When you accept a student application:
1. Go to **Applications** page
2. Review the application details
3. Click **Accept** button
4. Student is automatically created
5. Parent account is created (if email provided)
6. Parent receives invitation email

## Student Information

### Required Fields
- First Name
- Last Name
- Date of Birth
- Class Assignment
- Start Month

### Optional Fields
- Parent Email (for account creation)
- Medical Notes
- Allergies
- Address

## Student Status

- **Active**: Currently enrolled and attending
- **Archived**: No longer active (retains all history)

## Managing Students

### View Student Details
- Click on any student to view full profile
- See classes, attendance, invoices, and progress logs

### Edit Student
- Click **Edit** on student detail page
- Update information as needed
- Changes are logged in audit trail

### Archive Student
- Use **Archive** button to mark as inactive
- Archived students don't appear in active lists
- All historical data is preserved`
        },
        {
          title: 'Managing Applications',
          description: 'Review and process student enrollment applications',
          readTime: '7 min read',
          content: `# Managing Applications

The Applications page allows you to review and process enrollment applications submitted by parents through your public application form.

## Application Statuses

- **New**: Just submitted, awaiting review
- **Reviewed**: Under review by admin
- **Accepted**: Approved - student will be created
- **Rejected**: Not approved

## Reviewing Applications

### View Application Details
1. Go to **Applications** page
2. Click on any application card
3. Review all information:
   - Parent/Guardian details
   - Child information
   - Preferred class
   - Additional notes

### Application Actions

#### Accept Application
1. Review all details
2. Add admin notes if needed
3. Click **Accept** button
4. System automatically:
   - Creates student record
   - Creates parent user account (if email provided)
   - Sends parent invitation email
   - Enrolls student in preferred class (if available)

#### Reject Application
1. Add admin notes explaining rejection
2. Click **Reject** button
3. Application is marked as rejected
4. No student record is created

#### Mark as Reviewed
- Use this to track applications you're still considering
- Doesn't create any records yet

## Application Filters

- **Status Filter**: Filter by New, Reviewed, Accepted, or Rejected
- **Search**: Search by parent name, email, phone, or child name
- **Sort**: Sort by most recent or oldest

## Application Link

### Sharing Your Application Form
1. Go to **Applications** page
2. Click **Copy Application Link**
3. Share the link with prospective parents
4. Parents can submit applications directly

### View Public Form
- Click **View Public Form** to see what parents see
- Test the application process

## Best Practices

- Review applications promptly
- Add admin notes for important information
- Accept applications during business hours for better parent experience
- Use rejection notes to explain decisions professionally`
        }
      ]
    },
    {
      id: 'classes-teachers',
      title: 'Classes & Teachers',
      description: 'Create classes, assign teachers, and manage schedules',
      icon: GraduationCap,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      articles: [
        {
          title: 'Creating and Managing Classes',
          description: 'Set up classes, schedules, and student enrollments',
          readTime: '10 min read',
          content: `# Creating and Managing Classes

Classes are the core organizational unit in Madrasah OS. Each class represents a group of students learning together.

## Creating a Class

### Basic Information
1. Go to **Classes** page
2. Click **Add Class** button
3. Fill in required fields:
   - **Class Name**: e.g., "Quran Level 1", "Arabic Beginners"
   - **Teacher**: Assign a staff member
   - **Monthly Fee**: Amount charged per student per month
   - **Schedule**: Days and times the class meets

### Class Schedule
- Select days of the week
- Set start and end times
- Schedule is used for:
  - Calendar display
  - Attendance marking
  - Parent notifications

### Monthly Fee
- Set the fee amount in pounds (e.g., type 50 for £50.00, or 50.50 for £50.50)
- This fee is charged monthly per student
- Used for invoice generation

## Managing Classes

### View Class Details
- Click on any class to see:
  - Enrolled students
  - Attendance statistics
  - Schedule information
  - Teacher details

### Edit Class
- Update class name, teacher, fee, or schedule
- Changes apply to future invoices
- Historical data is preserved

### Archive Class
- Archive classes that are no longer active
- Archived classes don't appear in active lists
- Student enrollment history is maintained

## Student Enrollment

### Enroll Students
1. Go to class detail page
2. Click **Enroll Students**
3. Select students to add
4. Students are immediately enrolled

### Remove Students
- Use **Remove** button on class detail page
- Student's enrollment history is preserved
- Future invoices won't include this class

## Class Statistics

Each class shows:
- **Total Students**: Current enrollment count
- **Attendance Rate**: Average attendance percentage
- **Monthly Revenue**: Total fees from this class`
        },
        {
          title: 'Managing Teachers and Staff',
          description: 'Add staff members and assign permissions',
          readTime: '8 min read',
          content: `# Managing Teachers and Staff

Staff members can have different roles and permissions based on their responsibilities.

## Staff Roles

### Admin Subrole
- Full access to all features
- Can manage settings and other staff
- Equivalent to Admin role

### Teacher
- Access to assigned classes
- Can mark attendance
- Can view student records for their classes
- Can send messages
- Can view calendar

### Finance Officer
- Access to financial data
- Can view invoices and payments
- Can record manual payments
- Limited to financial features only

## Adding Staff Members

1. Go to **Staff** page
2. Click **Add Staff Member**
3. Enter information:
   - Name
   - Email (must be unique)
   - Phone number
   - Role/Subrole
4. Staff member receives invitation email
5. They create their account and can log in

## Assigning Permissions

### Granular Permissions
- Each staff member can have specific permissions
- Permissions control access to features
- Examples:
  - Access Students
  - Access Classes
  - Access Attendance
  - Access Payments
  - Access Settings

### Permission Management
1. Go to staff member's detail page
2. Click **Edit Permissions**
3. Select/deselect permissions as needed
4. Changes take effect immediately

## Teacher Assignments

### Assign to Classes
- When creating/editing a class, select a teacher
- Teacher can see all students in their classes
- Teacher can mark attendance for their classes

## Best Practices

- Assign minimum necessary permissions
- Use Finance Officer role for financial-only access
- Regularly review staff permissions
- Archive staff members who leave`
        }
      ]
    },
    {
      id: 'attendance',
      title: 'Attendance Tracking',
      description: 'Mark and monitor student attendance',
      icon: ClipboardList,
      color: 'text-teal-600',
      bgColor: 'bg-teal-50',
      borderColor: 'border-teal-200',
      articles: [
        {
          title: 'Marking Attendance',
          description: 'Learn how to mark attendance for your classes',
          readTime: '6 min read',
          content: `# Marking Attendance

Attendance tracking helps you monitor student participation and identify patterns.

## Marking Attendance

### Bulk Marking
1. Go to **Attendance** page
2. Select a class from the dropdown
3. Select a date
4. For each student, mark as:
   - **Present**: Student attended
   - **Late**: Student arrived after class started
   - **Absent**: Student did not attend
5. Click **Save Attendance**

### Quick Actions
- **Mark All Present**: Quickly mark entire class as present
- **Mark All Absent**: Mark entire class as absent
- Individual adjustments can be made after

## Attendance History

### View Past Attendance
- Select class and date range
- See attendance records for any period
- View attendance statistics per student

### Attendance Statistics
- **Overall Rate**: Percentage of classes attended
- **Present Days**: Total days present
- **Late Days**: Total days late
- **Absent Days**: Total days absent

## Attendance Reports

### Export Data
- Export attendance to CSV
- Filter by class, date range, or student
- Use for reporting and analysis

## Parent Notifications

When attendance is marked:
- Parents can see attendance in their portal
- Absences may trigger notifications (if configured)
- Late arrivals are tracked separately

## Best Practices

- Mark attendance daily after each class
- Use consistent marking (Present/Late/Absent)
- Review attendance patterns regularly
- Contact parents about frequent absences`
        }
      ]
    },
    {
      id: 'payments-billing',
      title: 'Payments & Billing',
      description: 'Manage fees, invoices, and payments',
      icon: CreditCard,
      color: 'text-rose-600',
      bgColor: 'bg-rose-50',
      borderColor: 'border-rose-200',
      articles: [
        {
          title: 'Setting Up Payment Methods',
          description: 'Configure how parents can pay fees',
          readTime: '8 min read',
          content: `# Setting Up Payment Methods

Payment methods determine how parents can pay their children's fees. You can accept multiple payment methods simultaneously.

## Payment Method Options

### Card Payments (Automatic)
- Requires Stripe Connect setup
- Parents add cards to their accounts
- Automatic charging on billing day
- Most convenient for recurring payments

### Cash Payments
- Record manually when received
- No online processing required
- Good for in-person payments

### Bank Transfer
- Parents transfer directly to your account
- You record when payment is received
- Requires bank account details setup

## Setting Your Billing Day

**Critical**: You must set a billing day before adding students.

### What is Billing Day?
- Day of month (1-28) when fees are due
- Automatic card payments are processed on this day
- Invoice due dates are calculated from this day
- Payment status (LATE/OVERDUE) is based on this day

### How to Set Billing Day
1. Go to **Settings** → **Payment Methods**
2. Find **Billing Day** section
3. Enter a number between 1 and 28
4. Click **Save Billing Day**
5. This setting is required and cannot be skipped

### Billing Day Best Practices
- Choose a day that works for your cash flow
- Consider when parents receive income
- Avoid month-end if possible (some months have 30/31 days)
- Communicate billing day to parents

## Configuring Payment Methods

1. Go to **Settings** → **Payment Methods**
2. Toggle payment methods on/off:
   - **Card Payments**: Enable Stripe Connect
   - **Cash Payments**: Enable cash acceptance
   - **Bank Transfer**: Enable bank transfers
3. For bank transfers, add:
   - Bank Account Name
   - Sort Code
   - Account Number
   - Payment Instructions

## Stripe Connect Setup

For card payments:
1. Enable **Card Payments** toggle
2. Click **Connect Stripe Account**
3. Complete Stripe onboarding
4. Once connected, parents can add cards
5. Automatic payments process on billing day

## Payment Instructions

Add custom instructions for parents:
- Where to send bank transfers
- Cash payment locations
- Payment deadlines
- Contact information for payment questions`
        },
        {
          title: 'Managing Fees and Invoices',
          description: 'Create fee plans and generate invoices',
          readTime: '10 min read',
          content: `# Managing Fees and Invoices

Fees are managed through fee plans, which are then applied to students through invoices.

## Fee Plans

### Creating a Fee Plan
1. Go to **Fees** page
2. Click **Add Fee Plan**
3. Enter:
   - **Name**: e.g., "Monthly Tuition", "Registration Fee"
   - **Amount**: Fee amount in pounds (e.g., type 50 for £50.00, or 50.50 for £50.50)
   - **Cadence**: Currently supports MONTHLY
   - **Active Status**: Enable/disable the plan

### Managing Fee Plans
- Edit fee plans to update amounts
- Deactivate plans that are no longer used
- Active plans can be assigned to students

## Invoices

### Automatic Invoice Generation
Invoices are created automatically when:
- Students are enrolled in classes (monthly class fees)
- Fee plans are assigned to students
- Monthly billing cycle runs

### Manual Invoice Creation
1. Go to **Payments** page
2. Click **Create Invoice**
3. Select:
   - Student
   - Fee Plan or enter custom amount
   - Due Date (based on billing day)
4. Invoice is created immediately

### Invoice Statuses
- **DRAFT**: Created but not yet sent
- **PENDING**: Sent, awaiting payment
- **PAID**: Payment received
- **OVERDUE**: Past due date, not paid
- **LATE**: Recently past due (48-96 hours)

## Payment Processing

### Automatic Card Payments
- Processed on billing day
- Charged to parent's saved card
- Status updated automatically
- Failed payments marked as FAILED

### Manual Payment Recording
1. Go to **Payments** page
2. Find the invoice
3. Click **Record Payment**
4. Select payment method (Cash/Bank Transfer)
5. Enter payment details
6. Payment is recorded and invoice marked as PAID

## Payment Records

View all payment history:
- Go to **Payments** → **Payment Records**
- See all payments with:
  - Date and time
  - Amount
  - Method
  - Status
  - Reference numbers

## Payment Status Calculation

Status is automatically calculated based on:
- **Billing Day**: When payment is due
- **Current Date**: How many days past due
- **Payment Status**: Whether payment was received

- **PENDING**: Not yet due or recently due (< 48 hours)
- **LATE**: 48-96 hours past due date
- **OVERDUE**: More than 96 hours (4 days) past due date
- **PAID**: Payment received`
        },
        {
          title: 'Gift Aid Management',
          description: 'Track and export Gift Aid declarations',
          readTime: '7 min read',
          content: `# Gift Aid Management

Gift Aid allows your madrasah to claim back tax on donations and fee payments from eligible parents.

## Gift Aid Overview

### What is Gift Aid?
- UK tax relief scheme for charities
- Allows claiming 25% extra on eligible payments
- Parents must be UK taxpayers
- Requires parent declaration

## Parent Declarations

### Declaration Status
Parents can declare:
- **YES**: Eligible and consenting
- **NO**: Not eligible or not consenting
- **NOT_SURE**: Haven't decided yet

### Viewing Declarations
1. Go to **Gift Aid** page
2. See all parents and their status
3. Filter by declaration status
4. View analytics:
   - Total claimed
   - Active parents
   - Potential value

## Sending Reminders

### Remind Parents
1. Filter parents by status (NOT_SURE or NO)
2. Click **Send Reminders**
3. Parents receive message to update their declaration
4. Can send to specific parents or all

## Exporting for HMRC

### CSV Export
1. Go to **Gift Aid** page
2. Select date range for claim period
3. Click **Export CSV**
4. File includes:
   - Parent details
   - Payment amounts
   - Declaration status
   - Dates

### HMRC Submission
- Use exported CSV for HMRC claims
- Ensure all declarations are valid
- Keep records of all submissions

## Best Practices

- Regularly remind parents to declare
- Export data quarterly for HMRC
- Keep accurate records of all declarations
- Verify parent eligibility before claiming`
        }
      ]
    },
    {
      id: 'communication',
      title: 'Communication',
      description: 'Send messages and announcements to parents',
      icon: MessageSquare,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      borderColor: 'border-indigo-200',
      articles: [
        {
          title: 'Sending Messages to Parents',
          description: 'Create and send announcements via email and WhatsApp',
          readTime: '8 min read',
          content: `# Sending Messages to Parents

Communicate with parents through email and WhatsApp announcements.

## Creating Messages

### Message Types
1. Go to **Messages** page
2. Click **Create Message**
3. Choose audience:
   - **All Parents**: Every parent in your madrasah
   - **By Class**: Select specific classes
   - **Individual**: Select specific parents

### Message Content
- **Subject**: Message title
- **Content**: Message body (supports formatting)
- **Channel**: Email, WhatsApp, or both
- **Show on Announcements**: Display on parent portal

## Message Channels

### Email (via Resend)
- Sent automatically when message is created
- Professional email formatting
- Delivery tracking
- Best for detailed information

### WhatsApp
- Message is prepared for you to copy
- You send manually through WhatsApp
- Good for quick updates
- Can include links and formatting

## Message Status

- **DRAFT**: Saved but not sent
- **SENT**: Successfully sent to all recipients

### Saving as Draft
- Create message and save as draft
- Edit and send later
- Useful for preparing messages in advance

## Announcements Page

When "Show on Announcements" is enabled:
- Message appears on parent portal
- Parents can view all announcements
- Useful for important notices

## Best Practices

- Use clear, concise subject lines
- Send important messages via both channels
- Save drafts for review before sending
- Use class-specific messages for targeted communication
- Include relevant dates and action items`
        }
      ]
    },
    {
      id: 'calendar',
      title: 'Calendar & Events',
      description: 'Manage events, holidays, and schedules',
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      articles: [
        {
          title: 'Managing Calendar Events',
          description: 'Create and manage events, holidays, and terms',
          readTime: '7 min read',
          content: `# Managing Calendar Events

The calendar helps you organize classes, holidays, exams, and other important dates.

## Event Types

### Classes
- Automatically added from class schedules
- Shows class times and locations
- Repeats based on schedule

### Holidays
- School closure dates
- Date ranges supported
- Visible to all parents

### Terms
- Academic term periods
- Define start and end dates
- Used for reporting and planning

### Exams
- Exam dates and times
- Linked to specific classes
- Important for parents to know

### Meetings
- Staff meetings
- Parent meetings
- Other important gatherings

## Creating Events

1. Go to **Calendar** page
2. Click **Add Event**
3. Select event type
4. Enter details:
   - Title
   - Date and time
   - Description (optional)
   - Class (for exams)
5. Click **Save**

## Calendar Views

### Month View
- See entire month at a glance
- Color-coded by event type
- Click events for details

### Week View
- Focused weekly view
- Better for detailed scheduling
- See time slots clearly

## Exporting Calendar

### ICS Export
- Export calendar as .ics file
- Import into Google Calendar, Outlook, etc.
- Parents can subscribe to your calendar
- Updates automatically

## Best Practices

- Add holidays well in advance
- Mark exam dates early
- Keep calendar updated regularly
- Export and share with parents`
        }
      ]
    },
    {
      id: 'reports',
      title: 'Reports & Analytics',
      description: 'Generate reports and view analytics',
      icon: BarChart3,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-50',
      borderColor: 'border-cyan-200',
      articles: [
        {
          title: 'Generating Reports',
          description: 'Create attendance, financial, and student reports',
          readTime: '8 min read',
          content: `# Generating Reports

Reports help you analyze performance and make data-driven decisions.

## Report Types

### Attendance Reports
- Class attendance by date range
- Student attendance history
- Attendance trends and patterns
- Export to CSV

### Financial Reports
- Revenue by month/period
- Payment collection rates
- Outstanding balances
- Payment method breakdown

### Student Reports
- Student enrollment lists
- Class rosters
- Student progress summaries
- Export student data

## Generating Reports

1. Click **Quick Add** → **Generate Report**
2. Select report type
3. Configure filters:
   - Date range
   - Classes
   - Students
   - Status
4. Click **Generate**
5. Review and export

## Report Formats

- **PDF**: Professional formatted documents
- **CSV**: Spreadsheet data for analysis
- **On-screen**: View in browser

## Analytics Dashboard

### Finances Page
- Total revenue
- Pending invoices
- Overdue amounts
- Payment success rate
- Revenue trends chart
- Payment method breakdown

### Dashboard Metrics
- Student growth
- Attendance rates
- Revenue trends
- Class performance

## Best Practices

- Generate monthly financial reports
- Review attendance patterns regularly
- Export data for external analysis
- Keep historical reports for comparison`
        }
      ]
    },
    {
      id: 'settings',
      title: 'Settings & Configuration',
      description: 'Configure your organisation and preferences',
      icon: Settings,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      articles: [
        {
          title: 'Organisation Settings',
          description: 'Manage your madrasah profile and preferences',
          readTime: '8 min read',
          content: `# Organisation Settings

Configure your madrasah's profile, contact information, and operational settings.

## Organisation Profile

### Basic Information
- **Name**: Your madrasah's official name
- **Timezone**: Set for accurate scheduling
- **Late Threshold**: Minutes considered "late" for attendance

### Address Information
- **Address Line 1**: Street address
- **City**: City name
- **Postcode**: UK postcode format
- **Full Address**: Legacy field for backward compatibility

### Contact Information
- **Contact Phone**: Internal phone (for Madrasah OS communications)
- **Public Phone**: Phone number shown to parents
- **Contact Email**: Internal email (for Madrasah OS)
- **Public Email**: Email shown to parents
- **Website**: Your madrasah's website URL

### Office Hours
- Select days of the week
- Set start and end times
- Displayed to parents on application form

## Payment Methods Settings

### Billing Day
- **Required**: Must be set before adding students
- **Range**: 1-28 (day of month)
- **Purpose**: When automatic payments process and invoices are due

### Payment Acceptance
- **Card Payments**: Enable Stripe Connect for automatic card payments
- **Cash Payments**: Accept cash payments
- **Bank Transfer**: Accept bank transfers (requires bank details)

### Bank Details (if accepting transfers)
- Bank Account Name
- Sort Code
- Account Number
- Payment Instructions

## Platform Subscription

### Payment Method
- Add card for platform billing
- Required before using most features
- £1 per active student monthly
- 30-day free trial

### Subscription Status
- View current status
- See next payment date
- View billing history
- Update payment method

## Profile Settings

### Personal Information
- Name
- Email
- Phone number
- Two-factor authentication

### Password
- Request password reset via email
- Secure password requirements

## Best Practices

- Keep contact information updated
- Set realistic office hours
- Communicate billing day to parents
- Regularly review subscription status`
        }
      ]
    }
  ]

  const filteredSections = documentationSections.map(section => ({
    ...section,
    articles: section.articles.filter(article => 
      article.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      article.content.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(section => section.articles.length > 0)

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
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Documentation</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Comprehensive guides and tutorials for using Madrasah OS
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-[var(--muted-foreground)] h-4 w-4" />
        <Input
          placeholder="Search documentation..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Link href="/support/faq">
          <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-[var(--border)]">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center flex-shrink-0">
                <HelpCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-medium text-[var(--foreground)]">FAQ</h3>
                <p className="text-sm text-[var(--muted-foreground)]">Common questions</p>
              </div>
            </div>
          </Card>
        </Link>
        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-[var(--border)]">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Video className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-[var(--foreground)]">Video Tutorials</h3>
              <p className="text-sm text-[var(--muted-foreground)]">Step-by-step guides</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Documentation Sections */}
      <div className="space-y-8">
        {filteredSections.map((section) => {
          const IconComponent = section.icon
          return (
            <div key={section.id} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${section.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <IconComponent className={`h-5 w-5 ${section.color}`} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-[var(--foreground)]">{section.title}</h2>
                  <p className="text-sm text-[var(--muted-foreground)]">{section.description}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {section.articles.map((article, index) => (
                  <Card 
                    key={index} 
                    className={`p-4 hover:shadow-md transition-all cursor-pointer group border-[var(--border)] hover:${section.borderColor}`}
                    onClick={() => setSelectedArticle(article)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between">
                        <h3 className="font-medium text-[var(--foreground)] group-hover:text-[var(--foreground)] transition-colors">{article.title}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {article.readTime}
                        </Badge>
                      </div>
                      <p className="text-sm text-[var(--muted-foreground)]">{article.description}</p>
                      <div className={`${section.color} group-hover:opacity-80 text-sm font-medium transition-opacity`}>
                        Read more →
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Contact Support */}
      <Card className={`p-6 bg-emerald-50 border-emerald-200`}>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-emerald-900 mb-2">Need more help?</h3>
          <p className="text-emerald-700 mb-4">
            Can't find what you're looking for? Our support team is here to help.
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

      {/* Article Modal */}
      {selectedArticle && (
        <div 
          className="fixed inset-0 bg-white/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedArticle(null)}
        >
          <div 
            className="bg-[var(--card)] border border-[var(--border)] rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)] bg-[var(--muted)]/30">
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-[var(--foreground)] mb-1">{selectedArticle.title}</h2>
                <p className="text-sm text-[var(--muted-foreground)]">{selectedArticle.description}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedArticle(null)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] p-2 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="max-w-3xl mx-auto">
                <div 
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: (() => {
                      const sanitized = sanitizeHtml(selectedArticle.content)
                      return sanitized
                        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-semibold mb-4 text-[var(--foreground)] border-b border-[var(--border)] pb-2">$1</h1>')
                        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mb-3 mt-6 text-[var(--foreground)]">$1</h2>')
                        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-medium mb-2 mt-4 text-[var(--foreground)]">$1</h3>')
                        .replace(/^#### (.*$)/gim, '<h4 class="text-base font-medium mb-2 mt-3 text-[var(--foreground)]">$1</h4>')
                        .replace(/^- (.*$)/gim, '<li class="mb-1 text-sm text-[var(--foreground)] leading-relaxed">$1</li>')
                        .replace(/^\* (.*$)/gim, '<li class="mb-1 text-sm text-[var(--foreground)] leading-relaxed">$1</li>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[var(--foreground)]">$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em class="italic text-[var(--muted-foreground)]">$1</em>')
                        .replace(/\n\n/g, '</p><p class="mb-4 text-sm text-[var(--foreground)] leading-relaxed">')
                        .replace(/^(?!<[h|l])/gm, '<p class="mb-4 text-sm text-[var(--foreground)] leading-relaxed">')
                        .replace(/(<li.*<\/li>)/g, '<ul class="list-disc ml-6 mb-4 space-y-1">$1</ul>')
                        .replace(/^(\d+\.) (.*$)/gim, '<li class="mb-1 text-sm text-[var(--foreground)] leading-relaxed"><span class="font-medium">$1</span> $2</li>')
                        .replace(/(<li class="mb-1 text-sm text-\[var\(--foreground\)\] leading-relaxed"><span class="font-medium">\d+\.<\/span>.*<\/li>)/g, '<ol class="list-decimal ml-6 mb-4 space-y-1">$1</ol>')
                    })()
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
