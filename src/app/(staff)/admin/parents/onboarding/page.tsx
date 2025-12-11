import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getActiveOrg } from '@/lib/org'
import { requireRole } from '@/lib/roles'
import { prisma } from '@/lib/prisma'
import { Page } from '@/components/shell/page'
import { ParentOnboardingDashboard } from '@/components/parent-onboarding-dashboard'

export default async function ParentOnboardingPage() {
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
    nextUrl: { pathname: '/admin/parents/onboarding' }
  } as any)

  if (userRole instanceof Response) {
    return <div>Unauthorized</div>
  }

  // Fetch students with claim status
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
      ClaimedByParent: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          emailVerified: true
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
              emailVerified: true
            }
          }
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

  // Calculate summary stats
  const stats = {
    claimed: students.filter(s => s.claimStatus === 'CLAIMED').length,
    notClaimed: students.filter(s => s.claimStatus === 'NOT_CLAIMED').length,
    pending: students.filter(s => s.claimStatus === 'PENDING_VERIFICATION').length,
    total: students.length
  }

  // Transform students data
  const transformedStudents = students.map(student => ({
    id: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    claimStatus: student.claimStatus,
    classes: student.StudentClass.map(sc => ({
      id: sc.Class.id,
      name: sc.Class.name
    })),
    claimedBy: student.ClaimedByParent ? {
      id: student.ClaimedByParent.id,
      name: student.ClaimedByParent.name || 'Unknown',
      email: student.ClaimedByParent.email,
      phone: student.ClaimedByParent.phone,
      emailVerified: !!student.ClaimedByParent.emailVerified
    } : null,
    parentLinks: student.ParentStudentLink.map(link => ({
      id: link.id,
      parent: {
        id: link.User.id,
        name: link.User.name || 'Unknown',
        email: link.User.email,
        phone: link.User.phone,
        emailVerified: !!link.User.emailVerified
      },
      claimedAt: link.claimedAt
    }))
  }))

  return (
    <Page
      user={session.user}
      org={org}
      userRole="ADMIN"
      title="Parent Onboarding Status"
      breadcrumbs={[
        { label: 'Dashboard', href: '/dashboard' },
        { label: 'Parent Onboarding' }
      ]}
    >
      <ParentOnboardingDashboard 
        students={transformedStudents}
        classes={classes}
        stats={stats}
      />
    </Page>
  )
}

