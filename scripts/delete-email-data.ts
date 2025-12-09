import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteEmailData() {
  try {
    const email = process.argv[2] || 'boycotterapp@gmail.com'
    
    console.log(`🔍 Searching for all data associated with: "${email}"...\n`)
    
    // Search for user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    // Search for leads
    const leads = await prisma.lead.findMany({
      where: {
        contactEmail: { contains: email, mode: 'insensitive' }
      },
      include: {
        LeadActivity: true
      }
    })

    // Search for organisations
    const orgs = await prisma.org.findMany({
      where: {
        OR: [
          { email: { contains: email, mode: 'insensitive' } },
          { publicEmail: { contains: email, mode: 'insensitive' } }
        ]
      }
    })

    // Search for applications
    const applications = await prisma.application.findMany({
      where: {
        guardianEmail: { contains: email, mode: 'insensitive' }
      }
    })

    console.log(`📊 Found data:`)
    console.log(`   Users: ${user ? 1 : 0}`)
    console.log(`   Leads: ${leads.length}`)
    console.log(`   Organisations: ${orgs.length}`)
    console.log(`   Applications: ${applications.length}`)

    if (!user && leads.length === 0 && orgs.length === 0 && applications.length === 0) {
      console.log(`\n❌ No data found associated with "${email}"`)
      process.exit(0)
    }

    console.log(`\n⚠️  WARNING: This will delete ALL data associated with "${email}"!`)
    console.log(`   This action cannot be undone.\n`)

    // Delete user if exists
    if (user) {
      console.log(`🗑️  Deleting user: ${user.email}...`)
      
      // Get counts
      const [
        accounts, memberships, students, classes, sessions, passwordTokens,
        billingProfiles, supportTickets, supportResponses, giftAidSubmissions,
        progressLogs, auditLogsAsActor
      ] = await Promise.all([
        prisma.account.count({ where: { userId: user.id } }),
        prisma.userOrgMembership.count({ where: { userId: user.id } }),
        prisma.student.count({ where: { primaryParentId: user.id } }),
        prisma.class.count({ where: { teacherId: user.id } }),
        prisma.session.count({ where: { userId: user.id } }),
        prisma.passwordResetToken.count({ where: { userId: user.id } }),
        prisma.parentBillingProfile.count({ where: { userId: user.id } }),
        prisma.supportTicket.count({ where: { userId: user.id } }),
        prisma.supportTicketResponse.count({ where: { userId: user.id } }),
        prisma.giftAidSubmission.count({ where: { createdById: user.id } }),
        prisma.progressLog.count({ where: { userId: user.id } }),
        prisma.auditLog.count({ where: { actorUserId: user.id } })
      ])

      console.log(`   Related records: ${accounts + memberships + students + classes + sessions + passwordTokens + billingProfiles + supportTickets + supportResponses + giftAidSubmissions + progressLogs + auditLogsAsActor}`)

      // Delete in order
      await prisma.account.deleteMany({ where: { userId: user.id } })
      await prisma.session.deleteMany({ where: { userId: user.id } })
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
      await prisma.supportTicketResponse.deleteMany({ where: { userId: user.id } })
      await prisma.supportTicket.deleteMany({ where: { userId: user.id } })
      await prisma.giftAidSubmission.deleteMany({ where: { createdById: user.id } })
      await prisma.progressLog.deleteMany({ where: { userId: user.id } })
      await prisma.application.updateMany({ where: { reviewedById: user.id }, data: { reviewedById: null } })
      await prisma.class.updateMany({ where: { teacherId: user.id }, data: { teacherId: null } })
      await prisma.student.updateMany({ where: { primaryParentId: user.id }, data: { primaryParentId: null } })
      await prisma.parentBillingProfile.deleteMany({ where: { userId: user.id } })
      await prisma.userOrgMembership.deleteMany({ where: { userId: user.id } })
      await prisma.auditLog.updateMany({ where: { actorUserId: user.id }, data: { actorUserId: null } })
      await prisma.user.delete({ where: { id: user.id } })
      
      console.log(`   ✅ User deleted\n`)
    }

    // Delete leads
    if (leads.length > 0) {
      console.log(`🗑️  Deleting ${leads.length} lead(s)...`)
      for (const lead of leads) {
        // Delete lead activities first
        if (lead.LeadActivity.length > 0) {
          await prisma.leadActivity.deleteMany({ where: { leadId: lead.id } })
        }
        await prisma.lead.delete({ where: { id: lead.id } })
        console.log(`   ✅ Deleted lead: ${lead.orgName} (${lead.contactEmail || 'N/A'})`)
      }
      console.log('')
    }

    // Delete organisations
    if (orgs.length > 0) {
      console.log(`🗑️  Deleting ${orgs.length} organisation(s)...`)
      for (const org of orgs) {
        // Get counts before deletion
        const [students, classes, invoices, memberships, applications] = await Promise.all([
          prisma.student.count({ where: { orgId: org.id } }),
          prisma.class.count({ where: { orgId: org.id } }),
          prisma.invoice.count({ where: { orgId: org.id } }),
          prisma.userOrgMembership.count({ where: { orgId: org.id } }),
          prisma.application.count({ where: { orgId: org.id } })
        ])

        console.log(`   Organisation: ${org.name}`)
        console.log(`   Related records: ${students} students, ${classes} classes, ${invoices} invoices, ${memberships} memberships, ${applications} applications`)

        // Delete organisation (cascade will handle related records)
        await prisma.org.delete({ where: { id: org.id } })
        console.log(`   ✅ Deleted organisation: ${org.name}`)
      }
      console.log('')
    }

    // Delete applications
    if (applications.length > 0) {
      console.log(`🗑️  Deleting ${applications.length} application(s)...`)
      for (const app of applications) {
        // Delete application children first
        await prisma.applicationChild.deleteMany({ where: { applicationId: app.id } })
        await prisma.application.delete({ where: { id: app.id } })
        console.log(`   ✅ Deleted application: ${app.guardianEmail} (${app.guardianName})`)
      }
      console.log('')
    }

    console.log(`\n✅ All data associated with "${email}" has been deleted successfully!`)

  } catch (error: any) {
    console.error('\n❌ Error deleting data:', error.message)
    console.error('   Stack:', error.stack)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

deleteEmailData()

