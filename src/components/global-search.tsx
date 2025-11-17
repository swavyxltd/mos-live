'use client'

import * as React from 'react'
import { 
  Search, 
  X, 
  User, 
  GraduationCap, 
  UserCheck, 
  FileText, 
  MessageSquare, 
  Calendar, 
  FileCheck,
  Home,
  Users,
  ClipboardList,
  DollarSign,
  CreditCard,
  HelpCircle,
  Settings,
  Building2,
  Package,
  Rocket,
  Wrench,
  BookOpen,
  BarChart3,
  TrendingUp,
  type LucideIcon
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface SearchResult {
  type: string
  id: string
  title: string
  subtitle: string
  url: string
  icon: string
}

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  User,
  GraduationCap,
  UserCheck,
  FileText,
  MessageSquare,
  Calendar,
  FileCheck,
  Home,
  Users,
  ClipboardList,
  DollarSign,
  CreditCard,
  HelpCircle,
  Settings,
  Building2,
  Package,
  Rocket,
  Wrench,
  BookOpen,
  BarChart3,
  TrendingUp,
}

export function GlobalSearch() {
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = React.useState(false)
  const [isLoading, setIsLoading] = React.useState(false)
  const [showResults, setShowResults] = React.useState(false)
  const [isMobileSearchOpen, setIsMobileSearchOpen] = React.useState(false)

  const searchTimeoutRef = React.useRef<NodeJS.Timeout>()

  const handleSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      setShowResults(false)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
      if (response.ok) {
        const data = await response.json()
        setResults(data.results || [])
        setShowResults(true)
      }
    } catch (error) {
      // Search error handled silently
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setQuery(value)

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current)
    }

    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      handleSearch(value)
    }, 300)
  }

  // Keyboard shortcut handler (⌘K or Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Check for ⌘K (Mac) or Ctrl+K (Windows/Linux)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        setIsOpen(true)
        setIsMobileSearchOpen(true)
      }
      // Close on Escape
      if (event.key === 'Escape' && (isOpen || isMobileSearchOpen)) {
        setIsOpen(false)
        setShowResults(false)
        setQuery('')
        setIsMobileSearchOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isMobileSearchOpen])

  // Close search when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (isOpen && !target.closest('.search-container')) {
        setIsOpen(false)
        setShowResults(false)
        setQuery('')
        setIsMobileSearchOpen(false)
      }
    }

    if (isOpen || isMobileSearchOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen, isMobileSearchOpen])

  const handleClear = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
    setIsMobileSearchOpen(false)
  }

  const handleResultClick = () => {
    setShowResults(false)
    setQuery('')
  }

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Search
    return <IconComponent className="h-5 w-5 text-[var(--muted-foreground)]" />
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'student': return 'bg-blue-50 text-blue-700 border-blue-200'
      case 'parent': return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      case 'class': return 'bg-green-50 text-green-700 border-green-200'
      case 'staff': return 'bg-purple-50 text-purple-700 border-purple-200'
      case 'payment': return 'bg-yellow-50 text-yellow-700 border-yellow-200'
      case 'invoice': return 'bg-amber-50 text-amber-700 border-amber-200'
      case 'message': return 'bg-pink-50 text-pink-700 border-pink-200'
      case 'event': return 'bg-orange-50 text-orange-700 border-orange-200'
      case 'application': return 'bg-indigo-50 text-indigo-700 border-indigo-200'
      case 'page': return 'bg-gray-50 text-gray-700 border-gray-200'
      case 'settings': return 'bg-slate-50 text-slate-700 border-slate-200'
      case 'faq': return 'bg-cyan-50 text-cyan-700 border-cyan-200'
      case 'guide': return 'bg-teal-50 text-teal-700 border-teal-200'
      default: return 'bg-gray-50 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="relative search-container">
      {/* Mobile: Search Icon Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsMobileSearchOpen(true)}
        className="md:hidden h-10 w-10 hover:bg-gray-100 flex-shrink-0"
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Desktop: Search Icon Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          setIsOpen(true)
          setIsMobileSearchOpen(true)
        }}
        className="hidden md:flex h-10 w-10 hover:bg-gray-100 flex-shrink-0"
      >
        <Search className="h-5 w-5" />
      </Button>

      {/* Search Modal - Desktop & Mobile (Spotlight-style) */}
      {isMobileSearchOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-white/20 backdrop-blur-md z-40"
            onClick={() => {
              setIsMobileSearchOpen(false)
              setQuery('')
              setShowResults(false)
              setIsOpen(false)
            }}
          />
          {/* Spotlight-style Search Modal */}
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 pointer-events-none">
            <div className="w-full max-w-3xl pointer-events-auto">
              {/* Search Input */}
              <div className="relative mb-4">
                <div className="relative">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-5 w-5 text-[var(--muted-foreground)] z-10" />
                  <Input
                    value={query}
                    onChange={handleInputChange}
                    onFocus={() => setIsOpen(true)}
                    placeholder="Search students, classes, staff, invoices..."
                    className="pl-14 pr-24 h-16 text-lg rounded-2xl border-0 bg-[var(--card)] shadow-2xl focus:ring-4 focus:ring-[var(--primary)]/20 transition-all duration-200 placeholder:text-[var(--muted-foreground)]"
                    autoFocus
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
                    {query && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClear}
                        className="h-8 w-8 p-0 hover:bg-[var(--muted)] rounded-lg"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    <kbd className="hidden sm:inline-flex h-7 select-none items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--muted)] px-2 font-mono text-xs font-medium text-[var(--muted-foreground)] opacity-60">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </div>
                </div>
              </div>
              
              {/* Search Results */}
              {isOpen && showResults && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl max-h-[60vh] overflow-y-auto backdrop-blur-sm">
                  {isLoading ? (
                    <div className="p-8 text-center text-[var(--muted-foreground)]">
                      <div className="animate-pulse">Searching...</div>
                    </div>
                  ) : results.length > 0 ? (
                    <div className="py-2">
                      {results.map((result, index) => (
                        <Link
                          key={`${result.type}-${result.id}-${index}`}
                          href={result.url}
                          onClick={() => {
                            handleResultClick()
                            setIsMobileSearchOpen(false)
                          }}
                          className="flex items-center gap-3 px-5 py-4 hover:bg-[var(--accent)] transition-all duration-150 border-b border-[var(--border)] last:border-b-0 cursor-pointer group"
                        >
                          <div className="w-11 h-11 bg-[var(--muted)] rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--primary)]/10 group-hover:scale-105 transition-all duration-150">
                            {getIcon(result.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate text-[var(--foreground)]">
                              {result.title}
                            </div>
                            <div className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                              {result.subtitle}
                            </div>
                          </div>
                          <Badge 
                            variant="outline" 
                            className={`text-xs border ${getTypeColor(result.type)}`}
                          >
                            {result.type}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  ) : query.length >= 2 ? (
                    <div className="p-8 text-center text-[var(--muted-foreground)]">
                      No results found for "{query}"
                    </div>
                  ) : (
                    <div className="p-8 text-center text-[var(--muted-foreground)]">
                      Start typing to search...
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}


    </div>
  )
}
