import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { getActiveOrg, getUserRoleInOrg, getUserOrgs, setActiveOrgId } from '@/lib/org'
import { Page } from '@/components/shell/page'
import { StaffLayoutWrapper } from '@/components/staff-layout-wrapper'
import { Role } from '@prisma/client'

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  let org = await getActiveOrg(session.user.id)
  if (!org) {
    // Try to automatically set the active org from user's organizations
    if (session?.user?.id) {
      try {
        console.log(`[StaffLayout] Attempting to auto-set org for user: ${session.user.id}`)
        const userOrgs = await getUserOrgs(session.user.id)
        console.log(`[StaffLayout] Found ${userOrgs?.length || 0} organizations for user`)
        
        if (userOrgs && Array.isArray(userOrgs) && userOrgs.length > 0) {
          // Filter out deactivated organizations (safely handle null/undefined status)
          const activeOrgs = userOrgs.filter((uo: any) => 
            uo && uo.org && uo.org.status && uo.org.status !== 'DEACTIVATED'
          )
          
          if (activeOrgs.length === 0) {
            console.error(`[StaffLayout] User only has deactivated organizations`)
            redirect('/auth/account-deactivated')
          }
          
          // Use the first organization (or prioritize admin orgs)
          // userOrgs is an array of UserOrgMembership objects with included org
          const adminOrg = activeOrgs.find((uo: any) => uo && uo.role === 'ADMIN')
          const selectedOrg = adminOrg || activeOrgs[0]
          
          console.log(`[StaffLayout] Selected org:`, selectedOrg?.org?.id, selectedOrg?.org?.name)
          
          // Check if selectedOrg has the org property
          if (selectedOrg && selectedOrg.org && selectedOrg.org.id) {
            console.log(`[StaffLayout] Setting active org to: ${selectedOrg.org.id}`)
            // Set the cookie for future requests, but use the org directly now
            await setActiveOrgId(selectedOrg.org.id)
            // Re-fetch org to ensure we have all fields
            org = await getActiveOrg(session.user.id)
            console.log(`[StaffLayout] Org set successfully:`, org?.id, org?.name)
          } else {
            console.error(`[StaffLayout] Selected org missing required properties:`, selectedOrg)
          }
        } else {
          console.error(`[StaffLayout] No organizations found for user ${session.user.id}`)
        }
      } catch (error: any) {
        console.error('[StaffLayout] Error setting active org:', error?.message || error)
        console.error('[StaffLayout] Error stack:', error?.stack)
        // Fall through to redirect if org setting fails
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

  // Check if organization is deactivated (handle null/undefined status)
  if (org.status && org.status === 'DEACTIVATED') {
    redirect('/auth/account-deactivated')
  }
  
  let userRole: Role | null = null
  try {
    userRole = await getUserRoleInOrg(session.user.id, org.id)
  } catch (error: any) {
    console.error('[StaffLayout] Error getting user role:', error?.message || error)
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
      userRole={userRole}
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
