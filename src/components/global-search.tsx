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
      console.error('Search error:', error)
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
      case 'student': return 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'
      case 'class': return 'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800'
      case 'staff': return 'bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800'
      case 'payment': return 'bg-yellow-50 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300 border-yellow-200 dark:border-yellow-800'
      case 'message': return 'bg-pink-50 dark:bg-pink-950 text-pink-700 dark:text-pink-300 border-pink-200 dark:border-pink-800'
      case 'event': return 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800'
      case 'application': return 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800'
      case 'page': return 'bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800'
      case 'settings': return 'bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800'
      case 'faq': return 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800'
      case 'guide': return 'bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800'
      default: return 'bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800'
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
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
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={handleInputChange}
                  onFocus={() => setIsOpen(true)}
                  placeholder="Search students, classes, staff, invoices..."
                  className="pl-12 pr-12 h-14 text-lg rounded-xl border-2 border-[var(--border)] bg-[var(--background)] shadow-xl focus:border-[var(--ring)] focus:ring-2 focus:ring-[var(--ring)]"
                  autoFocus
                />
                {query && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Search Results */}
              {isOpen && showResults && (
                <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg max-h-[60vh] overflow-y-auto">
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
                          className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--accent)] transition-colors border-b border-[var(--border)] last:border-b-0"
                        >
                          <div className="w-10 h-10 bg-[var(--muted)] rounded-lg flex items-center justify-center flex-shrink-0">
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
