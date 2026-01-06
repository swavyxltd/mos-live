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

  // Check role - ADMIN, OWNER, and STAFF (including teachers) can access
  const userRole = await getUserRoleInOrg(session.user.id, org.id)
  const membership = await prisma.userOrgMembership.findUnique({
    where: {
      userId_orgId: {
        userId: session.user.id,
        orgId: org.id
      }
    },
    select: {
      staffSubrole: true
    }
  })

  const isTeacher = membership?.staffSubrole === 'TEACHER' || (userRole === 'STAFF' && !membership?.staffSubrole)
  
  // Only block if user is not staff/admin/owner
  if (userRole !== 'ADMIN' && userRole !== 'OWNER' && userRole !== 'STAFF') {
    redirect('/dashboard')
  }

  // Get teacher's class IDs if user is a teacher
  let teacherClassIds: string[] = []
  if (isTeacher) {
    const teacherClasses = await prisma.class.findMany({
      where: {
        orgId: org.id,
        isArchived: false,
        teacherId: session.user.id
      },
      select: {
        id: true
      }
    })
    teacherClassIds = teacherClasses.map(c => c.id)
    
    // If teacher has no classes, return empty students list
    if (teacherClassIds.length === 0) {
      return (
        <OnboardingPageWrapper 
          initialStudents={[]}
          classes={[]}
          stats={{
            total: 0,
            notSignedUp: 0,
            signedUpNotVerified: 0,
            signedUpVerified: 0
          }}
          orgSlug={org.slug}
        />
      )
    }
  }

  // Fetch students - filter by teacher's classes if user is a teacher
  const students = await prisma.student.findMany({
    where: {
      orgId: org.id,
      isArchived: false,
      ...(isTeacher && {
        StudentClass: {
          some: {
            classId: { in: teacherClassIds }
          }
        }
      })
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

  // Fetch classes for filter - filter by teacher if user is a teacher
  const classes = await prisma.class.findMany({
    where: {
      orgId: org.id,
      isArchived: false,
      ...(isTeacher && { teacherId: session.user.id })
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

    // Deduplicate classes by class ID
    const uniqueClasses = Array.from(
      new Map(
        student.StudentClass.map(sc => [sc.Class.id, {
          id: sc.Class.id,
          name: sc.Class.name
        }])
      ).values()
    )

    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      dob: student.dob,
      classes: uniqueClasses,
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

