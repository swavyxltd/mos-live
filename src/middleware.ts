import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
// Removed Prisma usage: middleware runs on the Edge runtime and cannot use Prisma

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Allow auth routes, API routes, and maintenance page to pass through
  if (pathname.startsWith('/auth') || pathname.startsWith('/api') || pathname.startsWith('/_next') || pathname.startsWith('/maintenance')) {
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
    // So we'll use the token's isSuperAdmin and assume roleHints are correct
    roleHints = {
      isOwner: token.isSuperAdmin || false,
      orgAdminOf: roleHints?.orgAdminOf || [],
      orgStaffOf: roleHints?.orgStaffOf || [],
      isParent: roleHints?.isParent || false
    }
  }
  
  // Ensure isOwner matches isSuperAdmin (they should always be in sync)
  if (token.isSuperAdmin !== undefined) {
    roleHints.isOwner = token.isSuperAdmin
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
  // Owners and org admins are mutually exclusive - owners can only access /owner routes
  // Use token.isSuperAdmin directly (updated on every request) instead of roleHints.isOwner
  let correctPortal = ''
  if (token.isSuperAdmin) {
    correctPortal = '/owner'
  } else if (roleHints?.orgAdminOf && roleHints.orgAdminOf.length > 0) {
    correctPortal = '/staff'
  } else if (roleHints?.orgStaffOf && roleHints.orgStaffOf.length > 0) {
    correctPortal = '/staff'
  } else if (roleHints?.isParent) {
    correctPortal = '/parent'
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
  
  // Redirect Finance Officers and Teachers from regular dashboard
  if (pathname === '/dashboard' && roleHints.orgStaffOf.length > 0) {
    // Check if user is a Finance Officer or Teacher (we'll need to get this from the token)
    const token = await getToken({ req: request })
    if (token?.staffSubrole === 'FINANCE_OFFICER') {
      return NextResponse.redirect(new URL('/finances', request.url))
    }
    if (token?.staffSubrole === 'TEACHER') {
      return NextResponse.redirect(new URL('/classes', request.url))
    }
  }
  
  // Check if user is accessing a portal they shouldn't have access to
  // Use token.isSuperAdmin directly instead of roleHints.isOwner
  if (pathname.startsWith('/owner') && !token.isSuperAdmin) {
    // Redirect to their correct portal
    if (roleHints?.orgAdminOf && roleHints.orgAdminOf.length > 0) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else if (roleHints?.orgStaffOf && roleHints.orgStaffOf.length > 0) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else if (roleHints?.isParent) {
      return NextResponse.redirect(new URL('/parent/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
  }
  
  // Block owners from accessing /staff routes - owners and org admins are mutually exclusive
  // Use token.isSuperAdmin directly - this is updated on every request in JWT callback
  if (pathname.startsWith('/staff')) {
    // Owners cannot access staff routes - redirect to owner portal
    if (token.isSuperAdmin) {
      return NextResponse.redirect(new URL('/owner/overview', request.url))
    }
    // If they don't have org admin/staff access, redirect to sign in
    // Otherwise, let them through - the layout will handle permissions
    const hasOrgAccess = (roleHints?.orgAdminOf && roleHints.orgAdminOf.length > 0) || 
                         (roleHints?.orgStaffOf && roleHints.orgStaffOf.length > 0)
    if (!hasOrgAccess) {
      if (roleHints?.isParent) {
        return NextResponse.redirect(new URL('/parent/dashboard', request.url))
      } else {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }
    }
    // Allow through - layout will handle permissions like other staff routes
  }
  
  if (pathname.startsWith('/parent') && !roleHints?.isParent) {
    // Redirect to their correct portal
    if (token.isSuperAdmin) {
      return NextResponse.redirect(new URL('/owner/overview', request.url))
    } else if ((roleHints?.orgAdminOf && roleHints.orgAdminOf.length > 0) || 
               (roleHints?.orgStaffOf && roleHints.orgStaffOf.length > 0)) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    } else {
      return NextResponse.redirect(new URL('/auth/signin', request.url))
    }
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
