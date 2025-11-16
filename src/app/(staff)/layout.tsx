import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveOrg, getUserRoleInOrg, getUserOrgs, setActiveOrgId } from '@/lib/org'
import { Page } from '@/components/shell/page'
import { StaffLayoutWrapper } from '@/components/staff-layout-wrapper'
import { Role } from '@prisma/client'
import { getPlatformSettings } from '@/lib/platform-settings'

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
    // Try to automatically set the active org from user's organizations
    if (session?.user?.id) {
      try {
        const userOrgs = await getUserOrgs(session.user.id)
        
        if (userOrgs && Array.isArray(userOrgs) && userOrgs.length > 0) {
          // Use the first organization (or prioritize admin orgs)
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
      } catch (error: any) {
        // Silently fail - will redirect if org not set
      }
    }
    
    // If still no org, redirect
    if (!org) {
      redirect('/auth/signin?error=NoOrganization')
    }
  }

  // Ensure org is not null and has required fields before proceeding
  if (!org || !org.id || !org.name) {
    redirect('/auth/signin?error=NoOrganization')
  }

  // Check if organization is deactivated - redirect admin/staff to deactivated page
  if (org.status === 'DEACTIVATED') {
    const deactivatedUrl = `/auth/account-deactivated?org=${encodeURIComponent(org.name)}&reason=${encodeURIComponent(org.deactivatedReason || 'Account deactivated')}`
    redirect(deactivatedUrl)
  }

  // Check if organization is paused - redirect admin/staff to paused page
  if (org.status === 'PAUSED') {
    const pausedUrl = `/auth/account-paused?org=${encodeURIComponent(org.name)}&reason=${encodeURIComponent(org.pausedReason || 'Account paused')}&orgId=${encodeURIComponent(org.id)}`
    redirect(pausedUrl)
  }
  
  let userRole: Role | null = null
  try {
    userRole = await getUserRoleInOrg(session.user.id, org.id)
  } catch (error: any) {
    redirect('/auth/signin?error=NotMember')
  }
  
  if (!userRole) {
    redirect('/auth/signin?error=NotMember')
  }
  
  // Set staffSubrole based on userRole
  // ADMIN role -> ADMIN subrole
  // STAFF role -> TEACHER subrole (default for staff)
  // If user has staffSubrole in session, use that (from User model if stored)
  let staffSubrole = null
  if (userRole === 'ADMIN') {
    staffSubrole = 'ADMIN'
  } else if (userRole === 'STAFF') {
    // Check if user has staffSubrole stored (from User model if we add it later)
    // For now, default STAFF to TEACHER instead of ADMIN
    staffSubrole = (session.user as any)?.staffSubrole || 'TEACHER'
  }
  // PARENT role doesn't use staffSubrole
  
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
      title={staffSubrole === 'FINANCE_OFFICER' ? "Finance Dashboard" : "Staff Portal"}
      breadcrumbs={[{ label: staffSubrole === 'FINANCE_OFFICER' ? 'Finance Dashboard' : 'Dashboard' }]}
    >
      <StaffLayoutWrapper userRole={userRole} staffSubrole={staffSubrole}>
        {children}
      </StaffLayoutWrapper>
    </Page>
  )
}
