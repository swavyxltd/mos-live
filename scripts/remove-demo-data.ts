import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

dotenv.config({ path: resolve(process.cwd(), '.env') })

const prisma = new PrismaClient()

async function main() {
  const email = 'boycotterapp@gmail.com'
  
  console.log(`\n🗑️  Removing demo data for: ${email}\n`)
  console.log('─'.repeat(80))
  
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      memberships: {
        include: {
          org: true
        }
      }
    }
  })

  if (!user) {
    console.error(`❌ User with email ${email} not found`)
    process.exit(1)
  }

  console.log(`✅ Found user: ${user.name || user.email}`)
  console.log(`   User ID: ${user.id}`)
  console.log(`   Organizations: ${user.memberships.length}`)

  if (user.memberships.length === 0) {
    console.log('✅ No organizations found for this user')
    process.exit(0)
  }

  // Process each organization
  for (const membership of user.memberships) {
    const org = membership.org
    console.log(`\n📦 Processing organization: ${org.name} (${org.id})`)

    try {
      // Delete in order to respect foreign key constraints
      // 1. Delete attendance records
      const attendanceCount = await prisma.attendance.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${attendanceCount.count} attendance records`)

      // 2. Delete student-class relationships
      const studentClassCount = await prisma.studentClass.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${studentClassCount.count} student-class relationships`)

      // 3. Delete payments
      const paymentCount = await prisma.payment.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${paymentCount.count} payments`)

      // 4. Delete invoices
      const invoiceCount = await prisma.invoice.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${invoiceCount.count} invoices`)

      // 5. Delete monthly payment records
      const monthlyPaymentCount = await prisma.monthlyPaymentRecord.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${monthlyPaymentCount.count} monthly payment records`)

      // 6. Delete progress logs
      const progressLogCount = await prisma.progressLog.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${progressLogCount.count} progress logs`)

      // 7. Delete parent invitations
      const parentInvitationCount = await prisma.parentInvitation.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${parentInvitationCount.count} parent invitations`)

      // 8. Delete applications (and their children)
      const applicationCount = await prisma.application.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${applicationCount.count} applications`)

      // 9. Delete exams
      const examCount = await prisma.exam.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${examCount.count} exams`)

      // 10. Delete events
      const eventCount = await prisma.event.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${eventCount.count} events`)

      // 11. Delete holidays
      const holidayCount = await prisma.holiday.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${holidayCount.count} holidays`)

      // 12. Delete terms
      const termCount = await prisma.term.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${termCount.count} terms`)

      // 13. Delete messages
      const messageCount = await prisma.message.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${messageCount.count} messages`)

      // 14. Delete support ticket responses
      const supportTicketResponseCount = await prisma.supportTicketResponse.deleteMany({
        where: {
          ticket: {
            orgId: org.id
          }
        }
      })
      console.log(`   ✓ Deleted ${supportTicketResponseCount.count} support ticket responses`)

      // 15. Delete support tickets
      const supportTicketCount = await prisma.supportTicket.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${supportTicketCount.count} support tickets`)

      // 16. Delete invitations
      const invitationCount = await prisma.invitation.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${invitationCount.count} invitations`)

      // 17. Delete fees plans
      const feesPlanCount = await prisma.feesPlan.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${feesPlanCount.count} fees plans`)

      // 18. Delete parent billing profiles
      const parentBillingProfileCount = await prisma.parentBillingProfile.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${parentBillingProfileCount.count} parent billing profiles`)

      // 19. Delete students
      const studentCount = await prisma.student.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${studentCount.count} students`)

      // 20. Delete classes
      const classCount = await prisma.class.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${classCount.count} classes`)

      // 21. Delete audit logs
      const auditLogCount = await prisma.auditLog.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted ${auditLogCount.count} audit logs`)

      // 22. Delete platform billing (if exists)
      await prisma.platformOrgBilling.deleteMany({
        where: { orgId: org.id }
      })
      console.log(`   ✓ Deleted platform billing records`)

      console.log(`\n✅ Successfully removed all demo data for organization: ${org.name}`)

    } catch (error: any) {
      console.error(`\n❌ Error removing demo data for organization ${org.name}:`, error.message)
      throw error
    }
  }

  console.log('\n' + '─'.repeat(80))
  console.log(`\n✅ Demo data removal completed successfully!\n`)
  console.log(`Note: User account and organization(s) have been preserved.`)
  console.log(`Only demo data (students, classes, attendance, etc.) has been removed.\n`)
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

