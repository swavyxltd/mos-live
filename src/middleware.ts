import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
// Removed Prisma usage: middleware runs on the Edge runtime and cannot use Prisma

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow auth routes, API routes, maintenance page, and public signup pages to pass through
  if (pathname.startsWith('/auth') || 
      pathname.startsWith('/api') || 
      pathname.startsWith('/_next') || 
      pathname.startsWith('/maintenance') ||
      pathname.startsWith('/parent/signup') ||
      pathname.startsWith('/apply')) {
    return NextResponse.next()
  }
  
  // Get the JWT token to check user authentication and roles
  const token = await getToken({ req: request })
  
  // If user is not authenticated, redirect to sign in
  if (!token) {
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
    return NextResponse.next()
  }
  
  // Get role hints from token
  let roleHints = token.roleHints as {
    isOwner: boolean
    orgAdminOf: string[]
    orgStaffOf: string[]
    isParent: boolean
  } | undefined
  
  // If roleHints are missing or stale, try to reconstruct from token fields
  // This is a fallback in case the JWT callback hasn't updated the token yet
  if (!roleHints || (roleHints.isOwner && !token.isSuperAdmin)) {
    // Reconstruct roleHints from token fields as fallback
    // Note: We can't check org memberships in middleware (no Prisma on Edge)
    // So we'll use the token's isSuperAdmin and preserve existing org memberships
    roleHints = {
      isOwner: token.isSuperAdmin || false,
      orgAdminOf: roleHints?.orgAdminOf || [],
      orgStaffOf: roleHints?.orgStaffOf || [],
      isParent: roleHints?.isParent || false
    }
  }
  
  // Ensure isOwner matches isSuperAdmin (they should always be in sync)
  // But don't override if roleHints already exist and are valid
  if (token.isSuperAdmin !== undefined && roleHints) {
    // Only update isOwner if it's inconsistent with isSuperAdmin
    if (roleHints.isOwner !== token.isSuperAdmin) {
      roleHints.isOwner = token.isSuperAdmin
    }
  }
  
  // Debug logging for production issues
  if (process.env.NODE_ENV === 'development' || pathname.startsWith('/staff') || pathname.startsWith('/owner')) {
    console.log('[Middleware] Token roleHints:', {
      email: token.email,
      isSuperAdmin: token.isSuperAdmin,
      isOwner: roleHints?.isOwner,
      orgAdminOf: roleHints?.orgAdminOf,
      orgStaffOf: roleHints?.orgStaffOf,
      isParent: roleHints?.isParent,
      pathname,
      hasRoleHints: !!token.roleHints
    })
  }
  
      // If no role hints, redirect to sign in
      if (!roleHints) {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }

  // Org status checks skipped in middleware (no DB on Edge). Handled in server routes/pages if needed.
  
  // Determine the correct portal for this user
  // Priority: Owner → Parent → Admin → Staff
  // Parents should NEVER see staff/admin pages, even if they have those roles
  let correctPortal = ''
  if (token.isSuperAdmin) {
    correctPortal = '/owner'
  } else if (roleHints?.isParent) {
    // Parent is checked BEFORE admin/staff to ensure parents always go to parent portal
    correctPortal = '/parent'
  } else if (roleHints?.orgAdminOf && roleHints.orgAdminOf.length > 0) {
    correctPortal = '/staff'
  } else if (roleHints?.orgStaffOf && roleHints.orgStaffOf.length > 0) {
    correctPortal = '/staff'
  } else {
    // No clear role, redirect to sign in
    return NextResponse.redirect(new URL('/auth/signin', request.url))
  }
  
  // Check if user is trying to access the wrong portal
  if (pathname === '/') {
    // Redirect to the correct portal root
    if (correctPortal === '/owner') {
      return NextResponse.redirect(new URL('/owner/overview', request.url))
    } else if (correctPortal === '/staff') {
      // Check user subrole and redirect to appropriate page
      const token = await getToken({ req: request })
      if (token?.staffSubrole === 'FINANCE_OFFICER') {
        return NextResponse.redirect(new URL('/finances', request.url))
      }
      if (token?.staffSubrole === 'TEACHER') {
        return NextResponse.redirect(new URL('/classes', request.url))
      }
      // Default to dashboard for ADMIN subrole
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else if (correctPortal === '/parent') {
      return NextResponse.redirect(new URL('/parent/dashboard', request.url))
    }
  }
  
  // Block parents from accessing staff routes (dashboard, classes, etc.)
  // These routes are under /(staff) layout, so check if user is trying to access them
  if ((pathname.startsWith('/dashboard') || 
       pathname.startsWith('/classes') || 
       pathname.startsWith('/students') || 
       pathname.startsWith('/finances') || 
       pathname.startsWith('/payments') || 
       pathname.startsWith('/attendance') || 
       pathname.startsWith('/applications') || 
       pathname.startsWith('/staff') || 
       pathname.startsWith('/settings') ||
       pathname.startsWith('/messages') ||
       pathname.startsWith('/calendar') ||
       pathname.startsWith('/fees') ||
       pathname.startsWith('/gift-aid')) && 
      roleHints?.isParent && 
      !roleHints?.orgAdminOf?.length && 
      !roleHints?.orgStaffOf?.length) {
    // User is a parent trying to access staff routes - redirect to parent dashboard
    return NextResponse.redirect(new URL('/parent/dashboard', request.url))
  }

  // Redirect Finance Officers and Teachers from regular dashboard
  if (pathname === '/dashboard' && roleHints?.orgStaffOf && roleHints.orgStaffOf.length > 0 && !roleHints?.isParent) {
    // Check if user is a Finance Officer or Teacher (we'll need to get this from the token)
    const token = await getToken({ req: request })
    if (token?.staffSubrole === 'FINANCE_OFFICER') {
      return NextResponse.redirect(new URL('/finances', request.url))
    }
    if (token?.staffSubrole === 'TEACHER') {
      return NextResponse.redirect(new URL('/classes', request.url))
    }
  }
  
  // STRICT: Only allow super admins to access /owner routes
  // Use token.isSuperAdmin directly - this is the source of truth
  if (pathname.startsWith('/owner')) {
    if (!token.isSuperAdmin) {
      // Not a super admin - redirect to their correct portal
      if (roleHints?.isParent) {
        return NextResponse.redirect(new URL('/parent/dashboard', request.url))
      } else if (roleHints?.orgAdminOf && roleHints.orgAdminOf.length > 0) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else if (roleHints?.orgStaffOf && roleHints.orgStaffOf.length > 0) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }
    }
    // Super admin accessing /owner routes - allow through, no redirect needed
  }
  
  // Note: /staff routes (like /staff, /staff/[id], etc.) are handled by the (staff) layout
  // No special middleware check needed - they work exactly like /dashboard, /classes, etc.
  // The layout will handle permissions and access control
  
  if (pathname.startsWith('/parent')) {
    // Only redirect if we're CERTAIN they're not a parent
    // If roleHints are missing or unclear, let the layout handle verification
    if (roleHints && !roleHints.isParent) {
      // We have roleHints and they're definitely not a parent - redirect
      if (token.isSuperAdmin) {
        return NextResponse.redirect(new URL('/owner/overview', request.url))
      } else if ((roleHints.orgAdminOf && roleHints.orgAdminOf.length > 0) || 
                 (roleHints.orgStaffOf && roleHints.orgStaffOf.length > 0)) {
        return NextResponse.redirect(new URL('/dashboard', request.url))
      } else {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }
    }
    // If roleHints are missing or isParent is unclear, let the parent layout handle it
    // The layout will verify they're actually a parent and redirect if needed
  }
  
  // Add pathname as a header for server components to use
  const response = NextResponse.next()
  response.headers.set('x-pathname', pathname)
  
  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
