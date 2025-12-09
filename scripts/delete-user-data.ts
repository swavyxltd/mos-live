import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function deleteUserData() {
  try {
    const email = process.argv[2] || 'boycotterapp@gmail.com'
    
    console.log(`🔍 Searching for user with email: "${email}"...`)
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        UserOrgMembership: {
          include: {
            Org: true
          }
        },
        Student: true,
        Class: true,
        Application: true,
        Account: true,
        Session: true,
        PasswordResetToken: true,
        ParentBillingProfile: true,
        SupportTicket: true,
        SupportTicketResponse: true,
        Lead: true,
        LeadActivity: true,
        GiftAidSubmission: true,
        ProgressLog: true,
        AuditLog: {
          where: {
            actorUserId: undefined // Will be set after we get user id
          }
        }
      }
    })

    if (!user) {
      console.error(`❌ User with email "${email}" not found`)
      process.exit(1)
    }

    console.log(`\n📋 Found user:`)
    console.log(`   ID: ${user.id}`)
    console.log(`   Name: ${user.name || 'N/A'}`)
    console.log(`   Email: ${user.email}`)
    
    // Get counts of related records
    const [
      accounts,
      memberships,
      students,
      classes,
      applications,
      sessions,
      passwordTokens,
      billingProfiles,
      supportTickets,
      supportResponses,
      leads,
      leadActivities,
      giftAidSubmissions,
      progressLogs,
      auditLogsAsActor,
      auditLogsAsTarget
    ] = await Promise.all([
      prisma.account.count({ where: { userId: user.id } }),
      prisma.userOrgMembership.count({ where: { userId: user.id } }),
      prisma.student.count({ where: { primaryParentId: user.id } }),
      prisma.class.count({ where: { teacherId: user.id } }),
      prisma.application.count({ where: { reviewedById: user.id } }),
      prisma.session.count({ where: { userId: user.id } }),
      prisma.passwordResetToken.count({ where: { userId: user.id } }),
      prisma.parentBillingProfile.count({ where: { userId: user.id } }),
      prisma.supportTicket.count({ where: { userId: user.id } }),
      prisma.supportTicketResponse.count({ where: { userId: user.id } }),
      prisma.lead.count({ where: { createdById: user.id } }),
      prisma.leadActivity.count({ where: { userId: user.id } }),
      prisma.giftAidSubmission.count({ where: { createdById: user.id } }),
      prisma.progressLog.count({ where: { userId: user.id } }),
      prisma.auditLog.count({ where: { actorUserId: user.id } }),
      prisma.auditLog.count({ where: { targetId: user.id } })
    ])

    console.log(`\n📊 Related records:`)
    console.log(`   Accounts (OAuth): ${accounts}`)
    console.log(`   Organisation Memberships: ${memberships}`)
    console.log(`   Students (as parent): ${students}`)
    console.log(`   Classes (as teacher): ${classes}`)
    console.log(`   Applications (reviewed): ${applications}`)
    console.log(`   Sessions: ${sessions}`)
    console.log(`   Password Reset Tokens: ${passwordTokens}`)
    console.log(`   Billing Profiles: ${billingProfiles}`)
    console.log(`   Support Tickets: ${supportTickets}`)
    console.log(`   Support Responses: ${supportResponses}`)
    console.log(`   Leads: ${leads}`)
    console.log(`   Lead Activities: ${leadActivities}`)
    console.log(`   Gift Aid Submissions: ${giftAidSubmissions}`)
    console.log(`   Progress Logs: ${progressLogs}`)
    console.log(`   Audit Logs (as actor): ${auditLogsAsActor}`)
    console.log(`   Audit Logs (as target): ${auditLogsAsTarget}`)

    // Show organisation memberships
    if (user.UserOrgMembership.length > 0) {
      console.log(`\n🏢 Organisation Memberships:`)
      user.UserOrgMembership.forEach(membership => {
        console.log(`   - ${membership.Org.name} (${membership.role})`)
      })
    }

    console.log(`\n⚠️  WARNING: This will delete the user and ALL related data!`)
    console.log(`   This action cannot be undone.`)
    console.log(`\n🗑️  Starting deletion...\n`)

    // Delete in order to respect foreign key constraints
    
    // 1. Delete accounts (OAuth)
    if (accounts > 0) {
      console.log(`   Deleting ${accounts} account(s)...`)
      await prisma.account.deleteMany({ where: { userId: user.id } })
    }

    // 2. Delete sessions
    if (sessions > 0) {
      console.log(`   Deleting ${sessions} session(s)...`)
      await prisma.session.deleteMany({ where: { userId: user.id } })
    }

    // 3. Delete password reset tokens
    if (passwordTokens > 0) {
      console.log(`   Deleting ${passwordTokens} password reset token(s)...`)
      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } })
    }

    // 4. Delete support ticket responses
    if (supportResponses > 0) {
      console.log(`   Deleting ${supportResponses} support ticket response(s)...`)
      await prisma.supportTicketResponse.deleteMany({ where: { userId: user.id } })
    }

    // 5. Delete support tickets
    if (supportTickets > 0) {
      console.log(`   Deleting ${supportTickets} support ticket(s)...`)
      await prisma.supportTicket.deleteMany({ where: { userId: user.id } })
    }

    // 6. Delete lead activities
    if (leadActivities > 0) {
      console.log(`   Deleting ${leadActivities} lead activit(ies)...`)
      await prisma.leadActivity.deleteMany({ where: { userId: user.id } })
    }

    // 7. Delete leads (if user created them)
    if (leads > 0) {
      console.log(`   Deleting ${leads} lead(s)...`)
      await prisma.lead.deleteMany({ where: { createdById: user.id } })
    }

    // 8. Delete gift aid submissions
    if (giftAidSubmissions > 0) {
      console.log(`   Deleting ${giftAidSubmissions} gift aid submission(s)...`)
      await prisma.giftAidSubmission.deleteMany({ where: { createdById: user.id } })
    }

    // 9. Delete progress logs
    if (progressLogs > 0) {
      console.log(`   Deleting ${progressLogs} progress log(s)...`)
      await prisma.progressLog.deleteMany({ where: { userId: user.id } })
    }

    // 10. Update applications to remove reviewedById (set to null)
    if (applications > 0) {
      console.log(`   Removing user from ${applications} application(s)...`)
      await prisma.application.updateMany({
        where: { reviewedById: user.id },
        data: { reviewedById: null }
      })
    }

    // 11. Update classes to remove teacherId (set to null)
    if (classes > 0) {
      console.log(`   Removing user from ${classes} class(es)...`)
      await prisma.class.updateMany({
        where: { teacherId: user.id },
        data: { teacherId: null }
      })
    }

    // 12. Update students to remove primaryParentId (set to null)
    if (students > 0) {
      console.log(`   Removing user from ${students} student(s)...`)
      await prisma.student.updateMany({
        where: { primaryParentId: user.id },
        data: { primaryParentId: null }
      })
    }

    // 13. Delete parent billing profile
    if (billingProfiles > 0) {
      console.log(`   Deleting ${billingProfiles} billing profile(s)...`)
      await prisma.parentBillingProfile.deleteMany({ where: { userId: user.id } })
    }

    // 14. Delete organisation memberships
    if (memberships > 0) {
      console.log(`   Deleting ${memberships} organisation membership(s)...`)
      await prisma.userOrgMembership.deleteMany({ where: { userId: user.id } })
    }

    // 15. Update audit logs to remove actorUserId (set to null)
    if (auditLogsAsActor > 0) {
      console.log(`   Removing user from ${auditLogsAsActor} audit log(s) as actor...`)
      await prisma.auditLog.updateMany({
        where: { actorUserId: user.id },
        data: { actorUserId: null }
      })
    }

    // 16. Finally, delete the user
    console.log(`   Deleting user...`)
    await prisma.user.delete({
      where: { id: user.id }
    })

    console.log(`\n✅ User "${user.email}" and all associated data deleted successfully!`)

  } catch (error: any) {
    console.error('\n❌ Error deleting user data:', error.message)
    console.error('   Stack:', error.stack)
    
    if (error.code === 'P2003') {
      console.error('   This error usually means there are foreign key constraints.')
      console.error('   Some records may need to be deleted manually.')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

deleteUserData()

