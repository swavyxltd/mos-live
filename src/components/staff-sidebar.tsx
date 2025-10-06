'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
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
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Role } from '@prisma/client'

interface StaffSidebarProps {
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
  userRole: Role
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: Home },
  { name: 'Classes', href: '/classes', icon: GraduationCap },
  { name: 'Students', href: '/students', icon: Users },
  { name: 'Attendance', href: '/attendance', icon: ClipboardList },
  { name: 'Fees', href: '/fees', icon: CreditCard },
  { name: 'Invoices', href: '/invoices', icon: FileText },
  { name: 'Messages', href: '/messages', icon: MessageSquare },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Support', href: '/support', icon: HelpCircle },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const ownerNavigation = [
  { name: 'Overview', href: '/owner/overview', icon: BarChart3 },
  { name: 'Organizations', href: '/owner/orgs', icon: Building2 },
  { name: 'Dunning', href: '/owner/dunning', icon: AlertTriangle },
  { name: 'Support', href: '/owner/support', icon: HelpCircle },
  { name: 'Settings', href: '/owner/settings', icon: Settings },
]

export function StaffSidebar({ user, org, userRole }: StaffSidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  
  const isOwner = user.isSuperAdmin || userRole === 'OWNER'
  const currentNavigation = isOwner ? ownerNavigation : navigation

  return (
    <>
      {/* Mobile menu button - only show on mobile */}
      <div className="sm:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">{org.name}</h1>
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

      {/* Mobile top padding - only show on mobile */}
      <div className="sm:hidden h-16"></div>

      {/* Mobile menu overlay - only show on mobile */}
      {mobileMenuOpen && (
        <div className="sm:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out sm:relative sm:inset-auto sm:translate-x-0",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">M</span>
                </div>
              </div>
              <div className="ml-3">
                <h1 className="text-lg font-semibold text-gray-900">Madrasah OS</h1>
                <p className="text-sm text-gray-500">{org.name}</p>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {user.image ? (
                  <img className="h-8 w-8 rounded-full" src={user.image} alt={user.name || ''} />
                ) : (
                  <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-700">
                      {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </span>
                  </div>
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user.name || user.email}</p>
                <div className="flex items-center space-x-1">
                  <Badge variant="secondary" className="text-xs">
                    {userRole}
                  </Badge>
                  {user.isSuperAdmin && (
                    <Crown className="h-3 w-3 text-yellow-500" />
                  )}
                </div>
              </div>
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
                    "group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors",
                    isActive
                      ? "bg-indigo-100 text-indigo-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5 flex-shrink-0",
                      isActive ? "text-indigo-500" : "text-gray-400 group-hover:text-gray-500"
                    )}
                  />
                  {item.name}
                </Link>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-4 py-4 border-t border-gray-200">
            <Button
              variant="ghost"
              className="w-full justify-start"
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
