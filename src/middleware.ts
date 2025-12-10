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
  const roleHints = token.roleHints as {
    isOwner: boolean
    orgAdminOf: string[]
    orgStaffOf: string[]
    isParent: boolean
  } | undefined
  
      // If no role hints, redirect to sign in
      if (!roleHints) {
        return NextResponse.redirect(new URL('/auth/signin', request.url))
      }

  // Org status checks skipped in middleware (no DB on Edge). Handled in server routes/pages if needed.
  
  // Determine the correct portal for this user
  let correctPortal = ''
  if (roleHints.isOwner) {
    correctPortal = '/owner'
  } else if (roleHints.orgAdminOf.length > 0 || roleHints.orgStaffOf.length > 0) {
    correctPortal = '/staff'
  } else if (roleHints.isParent) {
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
  if (pathname.startsWith('/owner') && !roleHints.isOwner) {
    // Redirect to their correct portal
    if (roleHints.orgAdminOf.length > 0 || roleHints.orgStaffOf.length > 0) {
      return NextResponse.redirect(new URL('/staff', request.url))
    } else if (roleHints.isParent) {
      return NextResponse.redirect(new URL('/parent/dashboard', request.url))
        } else {
          return NextResponse.redirect(new URL('/auth/signin', request.url))
        }
  }
  
  // Allow access to /staff routes if user is an org admin or staff member
  // Even if they're also an owner, they should be able to access org-level staff features
  if (pathname.startsWith('/staff') && roleHints.orgAdminOf.length === 0 && roleHints.orgStaffOf.length === 0) {
    // Only redirect if they're NOT an org admin/staff AND they're trying to access staff routes
    // If they're an owner but also an org admin, they should be able to access /staff
    if (roleHints.isOwner && roleHints.orgAdminOf.length === 0 && roleHints.orgStaffOf.length === 0) {
      return NextResponse.redirect(new URL('/owner/overview', request.url))
    } else if (roleHints.isParent) {
      return NextResponse.redirect(new URL('/parent/dashboard', request.url))
        } else {
          return NextResponse.redirect(new URL('/auth/signin', request.url))
        }
  }
  
  if (pathname.startsWith('/parent') && !roleHints.isParent) {
    // Redirect to their correct portal
    if (roleHints.isOwner) {
      return NextResponse.redirect(new URL('/owner/overview', request.url))
    } else if (roleHints.orgAdminOf.length > 0 || roleHints.orgStaffOf.length > 0) {
      return NextResponse.redirect(new URL('/staff', request.url))
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
