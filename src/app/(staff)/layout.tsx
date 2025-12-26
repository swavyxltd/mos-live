import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { getActiveOrg, getUserRoleInOrg, getUserOrgs, setActiveOrgId } from '@/lib/org'
import { Page } from '@/components/shell/page'
import { StaffLayoutWrapper } from '@/components/staff-layout-wrapper'
import { Role } from '@prisma/client'
import { getPlatformSettings } from '@/lib/platform-settings'
import { SIDEBAR_PAGE_PERMISSIONS, StaffPermissionKey } from '@/types/staff-roles'

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  // Check maintenance mode - owners can bypass
  if (!session.user.isSuperAdmin) {
    const settings = await getPlatformSettings()
    if (settings?.maintenanceMode) {
      redirect('/maintenance')
    }
  }

  let org = await getActiveOrg(session.user.id)
  if (!org) {
    // Try to automatically set the active org from user's organisations
    if (session?.user?.id) {
      try {
        const userOrgs = await getUserOrgs(session.user.id)
        
        if (userOrgs && Array.isArray(userOrgs) && userOrgs.length > 0) {
          // Use the first organisation (or prioritize admin orgs)
          // userOrgs is an array of UserOrgMembership objects with included org
          const adminOrg = userOrgs.find((uo: any) => uo && uo.role === 'ADMIN')
          const selectedOrg = adminOrg || userOrgs[0]
          
          // Check if selectedOrg has the org property
          if (selectedOrg && selectedOrg.org && selectedOrg.org.id) {
            // Set the cookie for future requests, but use the org directly now
            await setActiveOrgId(selectedOrg.org.id)
            // Re-fetch org to ensure we have all fields
            org = await getActiveOrg(session.user.id)
          }
        }
      } catch (error) {
        // If we can't get orgs, redirect to signin
        redirect('/auth/signin')
      }
    }
    
    if (!org) {
      redirect('/auth/signin')
    }
  }

  // Ensure org is not null and has required fields before proceeding
  if (!org || !org.id || !org.name) {
    redirect('/auth/signin?error=NoOrganisation')
  }

  // Check if organisation is deactivated - redirect admin/staff to deactivated page
  if (org.status === 'DEACTIVATED') {
    const deactivatedUrl = `/auth/account-deactivated?org=${encodeURIComponent(org.name)}&reason=${encodeURIComponent(org.deactivatedReason || 'Account deactivated')}`
    redirect(deactivatedUrl)
  }

  // Check if organisation is paused - redirect admin/staff to paused page
  if (org.status === 'PAUSED') {
    const pausedUrl = `/auth/account-paused?org=${encodeURIComponent(org.name)}&reason=${encodeURIComponent(org.pausedReason || 'Account paused')}&orgId=${encodeURIComponent(org.id)}`
    redirect(pausedUrl)
  }

  // Check if admin needs to complete onboarding
  let userRole: Role | null = null
  try {
    userRole = await getUserRoleInOrg(session.user.id, org.id)
  } catch (error: any) {
    redirect('/auth/signin?error=NotMember')
  }
  
  if (!userRole) {
    redirect('/auth/signin?error=NotMember')
  }

  // BLOCK PARENTS from accessing staff routes
  if (userRole === 'PARENT') {
    redirect('/parent/dashboard')
  }

  // Only allow ADMIN and STAFF roles
  if (userRole !== 'ADMIN' && userRole !== 'STAFF') {
    redirect('/auth/signin?error=NotAuthorized')
  }

  // Only show onboarding to the first admin (isInitialAdmin) on their first login
  if (userRole === 'ADMIN' && !session.user.isSuperAdmin) {
    const { prisma } = await import('@/lib/prisma')
    const membership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: org.id
        }
      },
      select: {
        isInitialAdmin: true
      }
    })

    // Only redirect to onboarding if this is the initial admin
    if (membership?.isInitialAdmin) {
      // Check if onboarding is complete
      const onboardingComplete = !!(
        org.addressLine1 &&
        org.city &&
        org.postcode &&
        org.phone &&
        org.email &&
        org.publicPhone &&
        org.publicEmail &&
        org.billingDay &&
        (org.acceptsCard || org.acceptsCash || org.acceptsBankTransfer)
      )

      // Get current path
      const headersList = await headers()
      const pathname = headersList.get('x-pathname') || ''
      
      // Redirect to setup if not complete and not already on setup page
      if (!onboardingComplete && !pathname.includes('/setup')) {
        redirect('/setup')
      }
    }
  }

  // Ensure org is not null and has required fields before proceeding
  if (!org || !org.id || !org.name) {
    redirect('/auth/signin?error=NoOrganisation')
  }

  
  // Get staffSubrole and permissions from database
  let staffSubrole = null
  let permissions: string[] = []
  
  if (userRole === 'ADMIN' || userRole === 'STAFF') {
    const { prisma } = await import('@/lib/prisma')
    const { getStaffPermissionsFromDb } = await import('@/lib/staff-permissions-db')
    
    // Get membership with subrole
    const membership = await prisma.userOrgMembership.findUnique({
      where: {
        userId_orgId: {
          userId: session.user.id,
          orgId: org.id,
        },
      },
    })
    
    if (membership) {
      staffSubrole = membership.staffSubrole || (userRole === 'ADMIN' ? 'ADMIN' : 'TEACHER')
      
      // Get permissions from database
      permissions = await getStaffPermissionsFromDb(session.user.id, org.id)
      
      // For ADMIN role or initial admin, ensure they have all permissions
      if (userRole === 'ADMIN' || membership.isInitialAdmin) {
        // If they don't have all permissions, they should (this is a safety check)
        const allPermissionKeys = Object.keys(SIDEBAR_PAGE_PERMISSIONS).map(
          route => SIDEBAR_PAGE_PERMISSIONS[route]
        ) as StaffPermissionKey[]
        const hasAllPermissions = allPermissionKeys.every(key => permissions.includes(key))
        if (!hasAllPermissions) {
          // Admin should have all permissions - this shouldn't happen, but if it does, grant them
          permissions = allPermissionKeys
        }
      }
    } else {
      staffSubrole = userRole === 'ADMIN' ? 'ADMIN' : 'TEACHER'
    }
    
    // Check route permissions (only for STAFF role, ADMIN always has access)
    if (userRole === 'STAFF' && !session.user.isSuperAdmin) {
      const headersList = await headers()
      const pathname = headersList.get('x-pathname') || ''
      
      if (pathname) {
        // Normalize the path (remove /staff prefix if present, but keep /staff as /staff)
        let normalizedPath: string
        if (pathname === '/staff') {
          // Keep /staff as /staff - don't normalize it away
          normalizedPath = '/staff'
        } else {
          // For other paths, remove /staff prefix if present
          normalizedPath = pathname.replace(/^\/staff\//, '/').replace(/^\/staff$/, '/staff')
          if (!normalizedPath || normalizedPath === '/') {
            normalizedPath = '/dashboard'
          }
        }
        
        // Handle nested routes (e.g., /classes/[id], /classes/new, /staff/[id]/edit)
        // Extract the base route (e.g., /classes from /classes/123 or /classes/new)
        const pathSegments = normalizedPath.split('/').filter(Boolean)
        if (pathSegments.length > 1 && normalizedPath !== '/staff') {
          // Check if second segment is a UUID (likely an ID) or a known nested route
          const secondSegment = pathSegments[1]
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(secondSegment)
          const isKnownNestedRoute = ['new', 'edit', 'create', 'update'].includes(secondSegment)
          
          // Support routes (docs, faq) should use /support for permission check
          if (pathSegments[0] === 'support' && ['docs', 'faq'].includes(secondSegment)) {
            normalizedPath = '/support'
          } else if (isUUID || isKnownNestedRoute) {
            // Use the base route for permission check (e.g., /classes)
            normalizedPath = `/${pathSegments[0]}`
          }
        }
        
        // Get the required permission for this route
        const requiredPermission = SIDEBAR_PAGE_PERMISSIONS[normalizedPath]
        
        // Block teachers and finance officers from accessing main dashboard
        if (normalizedPath === '/dashboard') {
          if (staffSubrole === 'TEACHER') {
            redirect('/classes')
          }
          if (staffSubrole === 'FINANCE_OFFICER') {
            redirect('/finances')
          }
        }
        
        // Only check if this route requires a specific permission
        // Dashboard is not accessible to teachers/finance officers (handled above)
        // /staff page is accessible to all staff users (ADMIN and STAFF roles)
        // The middleware already ensures only non-owners with org access can reach this layout
        if (requiredPermission && normalizedPath !== '/dashboard' && normalizedPath !== '/staff') {
          if (!permissions.includes(requiredPermission)) {
            // User doesn't have permission for this route - redirect based on subrole
            if (staffSubrole === 'TEACHER') {
              redirect('/classes')
            } else if (staffSubrole === 'FINANCE_OFFICER') {
              redirect('/finances')
            } else {
              redirect('/dashboard')
            }
          }
        }
        // /staff route is explicitly allowed for all staff users - no permission check needed
      }
    }
  }
  
  // Ensure org has all required fields for Page component
  // slug is optional - if missing, use org name as fallback
  const orgForPage = org.id && org.name ? {
    id: org.id,
    name: org.name,
    slug: org.slug || org.name.toLowerCase().replace(/\s+/g, '-')
  } : undefined
  
  return (
    <Page
      user={session.user}
      org={orgForPage}
      userRole={userRole as string}
      staffSubrole={staffSubrole}
      permissions={permissions}
      title={staffSubrole === 'FINANCE_OFFICER' ? "Finance Dashboard" : "Staff Portal"}
      breadcrumbs={[{ label: staffSubrole === 'FINANCE_OFFICER' ? 'Finance Dashboard' : 'Dashboard' }]}
    >
      <StaffLayoutWrapper userRole={userRole} staffSubrole={staffSubrole}>
        {children}
      </StaffLayoutWrapper>
    </Page>
  )
}
