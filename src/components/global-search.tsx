'use client'

import * as React from 'react'
import { Search, X } from 'lucide-react'
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

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'student': return 'bg-blue-100 text-blue-800'
      case 'class': return 'bg-green-100 text-green-800'
      case 'staff': return 'bg-purple-100 text-purple-800'
      case 'invoice': return 'bg-yellow-100 text-yellow-800'
      case 'message': return 'bg-pink-100 text-pink-800'
      case 'attendance': return 'bg-indigo-100 text-indigo-800'
      case 'event': return 'bg-orange-100 text-orange-800'
      case 'fee': return 'bg-emerald-100 text-emerald-800'
      default: return 'bg-gray-100 text-gray-800'
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
                <Card className="max-h-[60vh] overflow-y-auto shadow-2xl border-2 border-[var(--border)]">
                  <CardContent className="p-0">
                    {isLoading ? (
                      <div className="p-8 text-center text-muted-foreground">
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
                            className="flex items-center gap-4 p-4 hover:bg-[var(--accent)] transition-colors border-b border-[var(--border)] last:border-b-0"
                          >
                            <span className="text-2xl">{result.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-base truncate text-[var(--foreground)]">
                                {result.title}
                              </div>
                              <div className="text-sm text-[var(--muted-foreground)] truncate mt-1">
                                {result.subtitle}
                              </div>
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={`text-xs ${getTypeColor(result.type)}`}
                            >
                              {result.type}
                            </Badge>
                          </Link>
                        ))}
                      </div>
                    ) : query.length >= 2 ? (
                      <div className="p-8 text-center text-muted-foreground">
                        No results found for "{query}"
                      </div>
                    ) : (
                      <div className="p-8 text-center text-muted-foreground">
                        Start typing to search...
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </>
      )}


    </div>
  )
}
