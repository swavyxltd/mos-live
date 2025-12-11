import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg, getUserRoleInOrg } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { OnboardingPageWrapper } from '@/components/onboarding-page-wrapper'
import { redirect } from 'next/navigation'

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions)
  const org = await getActiveOrg()
  
  if (!session?.user?.id || !org) {
    redirect('/auth/signin')
  }

  // Check role - only ADMIN and OWNER can access
  const userRole = await getUserRoleInOrg(session.user.id, org.id)
  
  if (userRole !== 'ADMIN' && userRole !== 'OWNER') {
    redirect('/dashboard')
  }

  // Fetch all students with their parent links
  const students = await prisma.student.findMany({
    where: {
      orgId: org.id,
      isArchived: false
    },
    include: {
      StudentClass: {
        include: {
          Class: {
            select: {
              id: true,
              name: true
            }
          }
        }
      },
      ParentStudentLink: {
        include: {
          User: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              emailVerified: true,
              createdAt: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      User: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          emailVerified: true
        }
      },
      ClaimedByParent: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          emailVerified: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Fetch classes for filter
  const classes = await prisma.class.findMany({
    where: {
      orgId: org.id,
      isArchived: false
    },
    orderBy: {
      name: 'asc'
    }
  })

  // Transform students data with signup status
  const transformedStudents = students.map(student => {
    // Determine signup status
    const hasParentLink = student.ParentStudentLink.length > 0
    const primaryParent = student.User
    const claimedByParent = student.ClaimedByParent
    
    let signupStatus: 'not_signed_up' | 'signed_up_not_verified' | 'signed_up_verified' = 'not_signed_up'
    let parentInfo = null

    if (hasParentLink) {
      const parentLink = student.ParentStudentLink[0]
      const parent = parentLink.User
      signupStatus = 'signed_up_verified'
      parentInfo = {
        id: parent.id,
        name: parent.name || 'Unknown',
        email: parent.email,
        phone: parent.phone,
        emailVerified: !!parent.emailVerified,
        linkedAt: parentLink.createdAt
      }
    } else if (primaryParent) {
      signupStatus = 'signed_up_verified'
      parentInfo = {
        id: primaryParent.id,
        name: primaryParent.name || 'Unknown',
        email: primaryParent.email,
        phone: primaryParent.phone,
        emailVerified: !!primaryParent.emailVerified,
        linkedAt: null
      }
    } else if (claimedByParent) {
      signupStatus = 'signed_up_verified'
      parentInfo = {
        id: claimedByParent.id,
        name: claimedByParent.name || 'Unknown',
        email: claimedByParent.email,
        phone: claimedByParent.phone,
        emailVerified: !!claimedByParent.emailVerified,
        linkedAt: null
      }
    }

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      dob: student.dob,
      classes: student.StudentClass.map(sc => ({
        id: sc.Class.id,
        name: sc.Class.name
      })),
      signupStatus,
      parentInfo,
      claimStatus: student.claimStatus,
      createdAt: student.createdAt
    }
  })

  // Calculate summary stats
  const stats = {
    total: transformedStudents.length,
    notSignedUp: transformedStudents.filter(s => s.signupStatus === 'not_signed_up').length,
    signedUpNotVerified: 0, // No longer used - all signed up parents are considered verified
    signedUpVerified: transformedStudents.filter(s => s.signupStatus === 'signed_up_verified').length
  }

  return (
    <OnboardingPageWrapper 
      initialStudents={transformedStudents}
      classes={classes}
      stats={stats}
      orgSlug={org.slug}
    />
  )
}

