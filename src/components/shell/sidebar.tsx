'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MadrasahLogo } from '@/components/madrasah-logo'
import { StaffSubrole } from '@/types/staff-roles'
import { StaffSubroleBadge } from '@/components/staff-subrole-badge'
import { useStaffPermissions } from '@/lib/staff-permissions'
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
  FileCheck
} from 'lucide-react'

interface SidebarProps {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    isSuperAdmin: boolean
  }
  org: {
    id: string
    name: string
    slug: string
  }
  userRole: string
  staffSubrole?: string
}

const staffNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home, permission: 'view_all_data' },
  { name: 'Finance Dashboard', href: '/finance-dashboard', icon: Home, permission: 'view_invoices' },
  { name: 'Classes', href: '/classes', icon: GraduationCap, permission: 'view_all_classes' },
  { name: 'Students', href: '/students', icon: Users, permission: 'view_all_data' },
  { name: 'Applications', href: '/applications', icon: FileCheck, permission: 'view_applications' },
  { name: 'Staff', href: '/staff', icon: UserCheck, permission: 'manage_staff' },
  { name: 'Attendance', href: '/attendance', icon: ClipboardList, permission: 'mark_attendance' },
  { name: 'Fees', href: '/fees', icon: CreditCard, permission: 'manage_invoices' },
  { name: 'Payments', href: '/payments', icon: FileText, permission: 'view_invoices' },
  { name: 'Messages', href: '/messages', icon: MessageSquare, permission: 'send_messages' },
  { name: 'Calendar', href: '/calendar', icon: Calendar, permission: 'view_calendar' },
  { name: 'Support', href: '/support', icon: HelpCircle, permission: 'view_all_data' },
  { name: 'Settings', href: '/settings', icon: Settings, permission: 'access_settings' },
]

const ownerNavigation = [
  { name: 'Overview', href: '/owner/overview', icon: BarChart3 },
  { name: 'Organisations', href: '/owner/orgs', icon: Building2 },
  { name: 'Dunning', href: '/owner/dunning', icon: AlertTriangle },
  { name: 'Support', href: '/owner/support', icon: HelpCircle },
  { name: 'Settings', href: '/owner/settings', icon: Settings },
]

const parentNavigation = [
  { name: 'Dashboard', href: '/parent/dashboard', icon: Home },
  { name: 'Payments', href: '/parent/payments', icon: CreditCard },
  { name: 'Calendar', href: '/parent/calendar', icon: Calendar },
  { name: 'Support', href: '/parent/support', icon: HelpCircle },
]

export function Sidebar({ user, org, userRole, staffSubrole }: SidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false)
  const pathname = usePathname()
  
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
    // For staff users, filter navigation based on permissions
    // console.log('Shell Sidebar - staffSubrole:', staffSubrole, 'userRole:', userRole) // Debug log
    if (staffSubrole && userRole === 'STAFF') {
      const permissions = useStaffPermissions({
        id: user.id,
        email: user.email || '',
        name: user.name || '',
        isSuperAdmin: user.isSuperAdmin
      }, staffSubrole as StaffSubrole)
      currentNavigation = staffNavigation.filter(item => {
        // Handle special cases where multiple permissions can grant access
        if (item.name === 'Calendar') {
          return permissions.hasPermission('create_events') || permissions.hasPermission('view_calendar')
        }
        // Show appropriate dashboard based on subrole
        if (item.name === 'Dashboard' && staffSubrole === 'FINANCE_OFFICER') {
          return false // Hide regular dashboard for Finance Officers
        }
        if (item.name === 'Finance Dashboard' && staffSubrole !== 'FINANCE_OFFICER') {
          return false // Hide finance dashboard for non-Finance Officers
        }
        return permissions.hasPermission(item.permission || 'view_all_data')
      })
      // console.log('Shell Sidebar - filtered navigation:', currentNavigation.map(item => item.name)) // Debug log
    } else {
      currentNavigation = staffNavigation
      // console.log('Shell Sidebar - using full navigation (no subrole)') // Debug log
    }
  }

  return (
    <>
      {/* Mobile menu button */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--sidebar)] border-b border-[var(--sidebar-border)] px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MadrasahLogo showText={false} textSize="sm" className="mr-3" />
            <div>
              <h1 className="text-sm font-semibold text-[var(--sidebar-foreground)]">Madrasah OS</h1>
              <p className="text-xs text-[var(--muted-foreground)]">{org.name}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </Button>
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
              <p className="text-sm font-medium text-[var(--sidebar-foreground)] text-left">{org.name}</p>
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
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
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
