import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Adding demo lead data...')

  // Get the first owner/superadmin user to assign leads to
  const ownerUser = await prisma.user.findFirst({
    where: {
      isSuperAdmin: true,
    },
  })

  if (!ownerUser) {
    console.error('No owner user found. Please create an owner user first.')
    process.exit(1)
  }

  const now = new Date()
  const threeDaysAgo = new Date(now)
  threeDaysAgo.setDate(now.getDate() - 3)
  const oneWeekAgo = new Date(now)
  oneWeekAgo.setDate(now.getDate() - 7)
  const twoWeeksAgo = new Date(now)
  twoWeeksAgo.setDate(now.getDate() - 14)
  const threeWeeksAgo = new Date(now)
  threeWeeksAgo.setDate(now.getDate() - 21)
  const nextWeek = new Date(now)
  nextWeek.setDate(now.getDate() + 7)
  const tomorrow = new Date(now)
  tomorrow.setDate(now.getDate() + 1)

  const demoLeads = [
    // Lead 1: No email sent yet (ready for initial)
    {
      orgName: 'Masjid Al-Falah',
      city: 'Birmingham',
      country: 'UK',
      estimatedStudents: 75,
      contactName: 'Ahmed Khan',
      contactEmail: 'ahmed.khan@masjidalfalah.org.uk',
      contactPhone: '+44 121 123 4567',
      status: 'NEW',
      source: 'Referral',
      nextContactAt: now, // Due today
      notes: 'Interested in streamlining their admin processes. Has 3 classes currently.',
      assignedToUserId: ownerUser.id,
      lastEmailSentAt: null,
      lastEmailStage: null,
      emailOutreachCompleted: false,
    },
    // Lead 2: Initial email sent, ready for follow-up
    {
      orgName: 'Islamic Centre Manchester',
      city: 'Manchester',
      country: 'UK',
      estimatedStudents: 120,
      contactName: 'Fatima Ali',
      contactEmail: 'fatima.ali@icmanchester.org.uk',
      contactPhone: '+44 161 234 5678',
      status: 'CONTACTED',
      source: 'Cold call',
      lastContactAt: threeDaysAgo,
      nextContactAt: now, // Due today
      notes: 'Initial email sent 3 days ago. No response yet. Follow up needed.',
      assignedToUserId: ownerUser.id,
      lastEmailSentAt: threeDaysAgo,
      lastEmailStage: 'INITIAL',
      emailOutreachCompleted: false,
    },
    // Lead 3: Follow-up 1 sent, ready for second follow-up
    {
      orgName: 'Darul Uloom Leicester',
      city: 'Leicester',
      country: 'UK',
      estimatedStudents: 200,
      contactName: 'Mohammed Hassan',
      contactEmail: 'm.hassan@darululoomleicester.org.uk',
      contactPhone: '+44 116 345 6789',
      status: 'FOLLOW_UP',
      source: 'Website inquiry',
      lastContactAt: oneWeekAgo,
      nextContactAt: now, // Due today
      notes: 'Sent follow-up email last week. Showed interest but needs more information.',
      assignedToUserId: ownerUser.id,
      lastEmailSentAt: oneWeekAgo,
      lastEmailStage: 'FOLLOW_UP_1',
      emailOutreachCompleted: false,
    },
    // Lead 4: Follow-up 2 sent, ready for final
    {
      orgName: 'Al-Huda Academy',
      city: 'London',
      country: 'UK',
      estimatedStudents: 150,
      contactName: 'Aisha Rahman',
      contactEmail: 'aisha.rahman@alhudaacademy.co.uk',
      contactPhone: '+44 20 456 7890',
      status: 'FOLLOW_UP',
      source: 'Referral',
      lastContactAt: twoWeeksAgo,
      nextContactAt: now, // Due today
      notes: 'Second follow-up sent 2 weeks ago. Still considering options.',
      assignedToUserId: ownerUser.id,
      lastEmailSentAt: twoWeeksAgo,
      lastEmailStage: 'FOLLOW_UP_2',
      emailOutreachCompleted: false,
    },
    // Lead 5: Email outreach completed (FINAL sent)
    {
      orgName: 'Madrasah Al-Noor',
      city: 'Bradford',
      country: 'UK',
      estimatedStudents: 90,
      contactName: 'Yusuf Patel',
      contactEmail: 'yusuf.patel@madrasahalnoor.org.uk',
      contactPhone: '+44 1274 567 8901',
      status: 'ON_HOLD',
      source: 'Cold call',
      lastContactAt: threeWeeksAgo,
      nextContactAt: null,
      notes: 'Final email sent. Outreach sequence complete. Waiting for response.',
      assignedToUserId: ownerUser.id,
      lastEmailSentAt: threeWeeksAgo,
      lastEmailStage: 'FINAL',
      emailOutreachCompleted: true,
    },
    // Lead 6: No email address (should not show in email tasks)
    {
      orgName: 'Islamic School Leeds',
      city: 'Leeds',
      country: 'UK',
      estimatedStudents: 60,
      contactName: 'Hassan Malik',
      contactEmail: null,
      contactPhone: '+44 113 678 9012',
      status: 'NEW',
      source: 'Referral',
      nextContactAt: tomorrow,
      notes: 'No email address available. Contact via phone only.',
      assignedToUserId: ownerUser.id,
      lastEmailSentAt: null,
      lastEmailStage: null,
      emailOutreachCompleted: false,
    },
    // Lead 7: Demo booked (not in email outreach)
    {
      orgName: 'Quran Academy Sheffield',
      city: 'Sheffield',
      country: 'UK',
      estimatedStudents: 100,
      contactName: 'Zainab Ahmed',
      contactEmail: 'zainab.ahmed@quranacademy.org.uk',
      contactPhone: '+44 114 789 0123',
      status: 'DEMO_BOOKED',
      source: 'Website inquiry',
      lastContactAt: threeDaysAgo,
      nextContactAt: nextWeek,
      notes: 'Demo scheduled for next week. Very interested.',
      assignedToUserId: ownerUser.id,
      lastEmailSentAt: threeDaysAgo,
      lastEmailStage: 'INITIAL',
      emailOutreachCompleted: false,
    },
    // Lead 8: Won (should not show in email tasks)
    {
      orgName: 'Al-Amin Madrasah',
      city: 'Birmingham',
      country: 'UK',
      estimatedStudents: 80,
      contactName: 'Ibrahim Khan',
      contactEmail: 'ibrahim.khan@alaminmadrasah.org.uk',
      contactPhone: '+44 121 890 1234',
      status: 'WON',
      source: 'Referral',
      lastContactAt: oneWeekAgo,
      nextContactAt: null,
      notes: 'Converted to organisation. Successfully onboarded.',
      assignedToUserId: ownerUser.id,
      lastEmailSentAt: oneWeekAgo,
      lastEmailStage: 'FOLLOW_UP_1',
      emailOutreachCompleted: false,
    },
  ]

  for (const leadData of demoLeads) {
    try {
      const lead = await prisma.lead.create({
        data: leadData,
      })
      console.log(`✓ Created lead: ${lead.orgName}`)

      // Add some activities for leads that have sent emails
      if (lead.lastEmailSentAt) {
        const activityTypes = {
          INITIAL: 'Sent Initial outreach email',
          FOLLOW_UP_1: 'Sent Follow-up email',
          FOLLOW_UP_2: 'Sent Second follow-up email',
          FINAL: 'Sent Final follow-up email',
        }
        
        await prisma.leadActivity.create({
          data: {
            leadId: lead.id,
            type: 'EMAIL',
            description: activityTypes[lead.lastEmailStage as keyof typeof activityTypes] || 'Sent email',
            createdByUserId: ownerUser.id,
            createdAt: lead.lastEmailSentAt,
          },
        })
      }
    } catch (error: any) {
      console.error(`✗ Failed to create lead ${leadData.orgName}:`, error.message)
    }
  }

  console.log('\n✅ Demo lead data added successfully!')
  console.log('\nSummary:')
  console.log('- 4 leads ready for email outreach (due today)')
  console.log('- 1 lead with email outreach completed')
  console.log('- 1 lead without email address')
  console.log('- 1 lead with demo booked')
  console.log('- 1 lead won (converted)')
}

main()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

