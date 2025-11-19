'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MadrasahLogo } from '@/components/madrasah-logo'
import { StaffSubrole } from '@/types/staff-roles'
import { StaffSubroleBadge } from '@/components/staff-subrole-badge'
import { useStaffPermissions } from '@/lib/staff-permissions'
import { GlobalSearch } from '@/components/global-search'
import { 
  Home, 
  Users, 
  GraduationCap, 
  ClipboardList, 
  CreditCard, 
  FileText, 
  MessageSquare, 
  Calendar, 
  HelpCircle, 
  Settings,
  Crown,
  Building2,
  AlertTriangle,
  BarChart3,
  ChevronUp,
  UserCheck,
  FileCheck,
  DollarSign,
  TrendingUp,
  Activity,
  Shield,
  HeadphonesIcon,
  Search,
  Moon,
  Sun
} from 'lucide-react'

interface SidebarProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    isSuperAdmin: boolean
  }
  org?: {
    id: string
    name: string
    slug: string
  }
  userRole: string
  staffSubrole?: string
  permissions?: string[]
}

const staffNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, permissionKey: 'access_dashboard' },
  { name: 'Classes', href: '/classes', icon: GraduationCap, permissionKey: 'access_classes' },
  { name: 'Students', href: '/students', icon: Users, permissionKey: 'access_students' },
  { name: 'Applications', href: '/applications', icon: FileCheck, permissionKey: 'access_applications' },
  { name: 'Staff', href: '/staff', icon: UserCheck, permissionKey: 'access_staff' },
  { name: 'Attendance', href: '/attendance', icon: ClipboardList, permissionKey: 'access_attendance' },
  { name: 'Finances', href: '/finances', icon: Home, permissionKey: 'access_finances' },
  { name: 'Fees', href: '/fees', icon: CreditCard, permissionKey: 'access_fees' },
  { name: 'Payments', href: '/payments', icon: FileText, permissionKey: 'access_payments' },
  { name: 'Messages', href: '/messages', icon: MessageSquare, permissionKey: 'access_messages' },
  { name: 'Calendar', href: '/calendar', icon: Calendar, permissionKey: 'access_calendar' },
  { name: 'Support', href: '/support', icon: HelpCircle, permissionKey: 'access_support' },
  { name: 'Settings', href: '/settings', icon: Settings, permissionKey: 'access_settings' },
]

const ownerNavigation = [
  { name: 'Dashboard', href: '/owner/overview', icon: BarChart3 },
  { name: 'Analytics', href: '/owner/analytics', icon: TrendingUp },
  { name: 'Organisations', href: '/owner/orgs', icon: Building2 },
  { name: 'Revenue', href: '/owner/revenue', icon: DollarSign },
  { name: 'Users', href: '/owner/users', icon: Users },
  { name: 'Students', href: '/owner/students', icon: GraduationCap },
  { name: 'System Health', href: '/owner/system-health', icon: Activity },
  { name: 'Dunning', href: '/owner/dunning', icon: AlertTriangle },
  { name: 'Support', href: '/owner/support', icon: HeadphonesIcon },
  { name: 'Settings', href: '/owner/settings', icon: Settings },
]

const parentNavigation = [
  { name: 'Dashboard', href: '/parent/dashboard', icon: Home },
  { name: 'Announcements', href: '/parent/announcements', icon: MessageSquare },
  { name: 'Attendance', href: '/parent/attendance', icon: ClipboardList },
  { name: 'Calendar', href: '/parent/calendar', icon: Calendar },
  { name: 'Payments', href: '/parent/payments', icon: CreditCard },
  { name: 'Payment Methods', href: '/parent/payment-methods', icon: Settings },
  { name: 'Support', href: '/parent/support', icon: HelpCircle },
]

export function Sidebar({ user: initialUser, org, userRole, staffSubrole, permissions }: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const { data: session, status } = useSession()
  
  // Use session data if available (fresh from client), otherwise fall back to initial user prop
  // Always prioritize session data when it's loaded to ensure we get the latest from database
  const user = (session?.user && status === 'authenticated') ? {
    id: session.user.id || initialUser.id,
    name: session.user.name || initialUser.name,
    email: session.user.email || initialUser.email,
    image: session.user.image || initialUser.image,
    isSuperAdmin: session.user.isSuperAdmin ?? initialUser.isSuperAdmin
  } : initialUser
  const [isDarkMode, setIsDarkMode] = React.useState(false)
  const pathname = usePathname()

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode)
    document.documentElement.classList.toggle('dark')
  }
  
  const isOwner = user.isSuperAdmin || userRole === 'OWNER'
  const isParent = userRole === 'PARENT'
  
  // Get portal parameter from current pathname
  const getPortalParam = () => {
    if (pathname.startsWith('/parent/')) {
      return 'parent'
    } else if (pathname.startsWith('/owner/')) {
      return 'owner'
    }
    return null
  }
  
  const portalParam = getPortalParam()
  
  // Use permissions to filter staff navigation items
  let currentNavigation
  if (isOwner) {
    currentNavigation = ownerNavigation
  } else if (isParent) {
    currentNavigation = parentNavigation
  } else {
    // For staff users, filter navigation based on permissions from database
    if (userRole === 'STAFF' || userRole === 'ADMIN') {
      // Use permissions from database if available
      if (permissions && permissions.length > 0) {
        currentNavigation = staffNavigation.filter(item => {
          return permissions.includes(item.permissionKey)
        })
      } else {
        // Fallback to subrole-based permissions
        const permissionsHook = useStaffPermissions({
          id: user.id,
          email: user.email || '',
          name: user.name || '',
          isSuperAdmin: user.isSuperAdmin
        }, (staffSubrole || 'TEACHER') as StaffSubrole)
        
        currentNavigation = staffNavigation.filter(item => {
          // Map permission key to legacy permission for backward compatibility
          const legacyPermissionMap: Record<string, string> = {
            'access_dashboard': 'view_all_data',
            'access_classes': 'view_all_classes',
            'access_students': 'view_all_data',
            'access_applications': 'view_applications',
            'access_staff': 'manage_staff',
            'access_attendance': 'mark_attendance',
            'access_finances': 'view_invoices',
            'access_fees': 'manage_invoices',
            'access_payments': 'view_invoices',
            'access_messages': 'send_messages',
            'access_calendar': 'view_calendar',
            'access_support': 'view_all_data',
            'access_settings': 'access_settings',
          }
          const legacyPermission = legacyPermissionMap[item.permissionKey] || 'view_all_data'
          return permissionsHook.hasPermission(legacyPermission)
        })
      }
    } else {
      currentNavigation = staffNavigation
    }
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--sidebar)] border-b border-[var(--sidebar-border)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-semibold text-[var(--sidebar-foreground)] truncate">Madrasah OS</h1>
              <p className="text-sm text-[var(--muted-foreground)] truncate">{org?.name || 'Madrasah OS'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Search Icon - Mobile only */}
            {userRole !== 'PARENT' && (
              <div className="flex-shrink-0">
                <GlobalSearch />
              </div>
            )}
            {/* Dark Mode Toggle - Mobile only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleDarkMode}
              className="h-10 w-10 hover:bg-gray-100 flex-shrink-0"
            >
              {isDarkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            {/* Hamburger Menu */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="flex-shrink-0"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile top padding */}
      <div className="sm:hidden h-16"></div>

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[var(--sidebar)] border-r border-[var(--sidebar-border)] transform transition-transform duration-200 ease-in-out sm:fixed sm:inset-y-0 sm:left-0 sm:z-40 sm:transform-none",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full sm:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--sidebar-border)]">
            <div className="flex flex-col items-start w-full">
              <MadrasahLogo showText={false} textSize="md" className="mb-2" />
              <p className="text-sm font-medium text-[var(--sidebar-foreground)] text-left">{org?.name || 'Madrasah OS'}</p>
            </div>
          </div>


          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {currentNavigation.map((item) => {
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-[var(--radius-md)] transition-colors h-10",
                    isActive
                      ? "bg-[var(--secondary)] text-[var(--secondary-foreground)]"
                      : "text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive ? "text-[var(--secondary-foreground)]" : "text-[var(--muted-foreground)] group-hover:text-[var(--sidebar-accent-foreground)]"
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* User info and sign out */}
          <div className="px-4 py-4 border-t border-[var(--sidebar-border)] space-y-4">
            <div className="flex items-center px-3 py-2">
              <div className="flex-shrink-0">
                {user.image ? (
                  <img className="h-8 w-8 rounded-full" src={user.image} alt={user.name || ''} />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-[var(--muted)] flex items-center justify-center">
                    <span className="text-sm font-medium text-[var(--muted-foreground)]">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-[var(--sidebar-foreground)]">{user.name || user.email}</p>
                <div className="flex items-center space-x-1">
                  <Badge variant="secondary" className="text-xs">
                    {userRole}
                  </Badge>
                  {staffSubrole && userRole === 'STAFF' && (
                    <StaffSubroleBadge subrole={staffSubrole as StaffSubrole} className="text-xs" />
                  )}
                  {user.isSuperAdmin && (
                    <Crown className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
              </div>
            </div>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-[var(--sidebar-foreground)] hover:bg-[var(--sidebar-accent)] hover:text-[var(--sidebar-accent-foreground)]"
              onClick={() => {
                // Clear sessionStorage on sign out
                sessionStorage.clear()
                signOut({ callbackUrl: '/auth/signin' })
              }}
            >
              <svg className="mr-3 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Sign out
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
