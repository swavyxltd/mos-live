import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { requireRole } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { Page } from '@/components/shell/page'
import { OnboardingDashboard } from '@/components/onboarding-dashboard'

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    return <div>Loading...</div>
  }

  const org = await getActiveOrg(session.user.id)
  if (!org) {
    return <div>Loading...</div>
  }

  // Check role - only ADMIN and OWNER can access
  const userRole = await requireRole(['ADMIN', 'OWNER'])({ 
    headers: new Headers(),
    nextUrl: { pathname: '/admin/onboarding' }
  } as any)

  if (userRole instanceof Response) {
    return <div>Unauthorized</div>
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
      if (parent.emailVerified) {
        signupStatus = 'signed_up_verified'
      } else {
        signupStatus = 'signed_up_not_verified'
      }
      parentInfo = {
        id: parent.id,
        name: parent.name || 'Unknown',
        email: parent.email,
        phone: parent.phone,
        emailVerified: !!parent.emailVerified,
        linkedAt: parentLink.createdAt
      }
    } else if (primaryParent) {
      if (primaryParent.emailVerified) {
        signupStatus = 'signed_up_verified'
      } else {
        signupStatus = 'signed_up_not_verified'
      }
      parentInfo = {
        id: primaryParent.id,
        name: primaryParent.name || 'Unknown',
        email: primaryParent.email,
        phone: primaryParent.phone,
        emailVerified: !!primaryParent.emailVerified,
        linkedAt: null
      }
    } else if (claimedByParent) {
      if (claimedByParent.emailVerified) {
        signupStatus = 'signed_up_verified'
      } else {
        signupStatus = 'signed_up_not_verified'
      }
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
    signedUpNotVerified: transformedStudents.filter(s => s.signupStatus === 'signed_up_not_verified').length,
    signedUpVerified: transformedStudents.filter(s => s.signupStatus === 'signed_up_verified').length
  }

  return (
    <Page
      user={session.user}
      org={org}
      userRole="ADMIN"
      title="Student Onboarding"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Onboarding' }
      ]}
    >
      <OnboardingDashboard 
        students={transformedStudents}
        classes={classes}
        stats={stats}
      />
    </Page>
  )
}

