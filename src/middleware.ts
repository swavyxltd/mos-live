import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

export function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const host = request.headers.get('host') || ''
  
  // Get portal from query param (dev mode), pathname, or host
  const portalParam = searchParams.get('portal')
  let portal = 'app' // default
  
  if (portalParam && ['app', 'parent', 'auth'].includes(portalParam)) {
    portal = portalParam
  } else if (pathname.startsWith('/parent/')) {
    portal = 'parent'
  } else if (pathname.startsWith('/owner/')) {
    portal = 'owner'
  } else if (pathname.startsWith('/auth/')) {
    portal = 'auth'
  } else if (host.includes('parent.madrasah.io')) {
    portal = 'parent'
  } else if (host.includes('auth.madrasah.io')) {
    portal = 'auth'
  } else if (host.includes('app.madrasah.io')) {
    portal = 'app'
  }
  
  // Add portal to headers for use in components
  const response = NextResponse.next()
  response.headers.set('x-portal', portal)
  
  // Debug logging
  console.log(`Middleware: pathname=${pathname}, portal=${portal}, portalParam=${portalParam}`)
  
  // Handle auth portal redirects
  if (portal === 'auth' && pathname.startsWith('/auth')) {
    return response
  }
  
  // Handle parent portal
  if (portal === 'parent') {
    if (pathname.startsWith('/parent')) {
      return response
    }
    // Always redirect parent portal users to parent dashboard
    if (pathname === '/' || pathname.startsWith('/dashboard') || pathname.startsWith('/classes') || 
        pathname.startsWith('/students') || pathname.startsWith('/attendance') || 
        pathname.startsWith('/fees') || pathname.startsWith('/invoices') || 
        pathname.startsWith('/messages') || pathname.startsWith('/calendar') || 
        pathname.startsWith('/support') || pathname.startsWith('/settings') ||
        pathname.startsWith('/owner')) {
      console.log(`Redirecting parent portal user from ${pathname} to /parent/dashboard`)
      return NextResponse.redirect(new URL('/parent/dashboard', request.url))
    }
  }
  
  // Handle app portal
  if (portal === 'app') {
    if (pathname.startsWith('/parent')) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    if (pathname.startsWith('/owner')) {
      return response
    }
    if (pathname.startsWith('/dashboard') || pathname.startsWith('/classes') || 
        pathname.startsWith('/students') || pathname.startsWith('/attendance') || 
        pathname.startsWith('/fees') || pathname.startsWith('/invoices') || 
        pathname.startsWith('/messages') || pathname.startsWith('/calendar') || 
        pathname.startsWith('/support') || pathname.startsWith('/settings')) {
      return response
    }
  }
  
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
