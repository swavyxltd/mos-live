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

      {/* Desktop: Always visible search bar */}
      <div className="hidden md:block relative w-full max-w-2xl">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder="Search..."
          className="pl-10 pr-10 w-full rounded-[var(--radius-md)] border-[var(--border)] bg-[var(--background)]"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Mobile: Search bar overlay (shown when icon is clicked) */}
      {isMobileSearchOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="md:hidden fixed inset-0 bg-black/50 z-40"
            onClick={() => {
              setIsMobileSearchOpen(false)
              setQuery('')
              setShowResults(false)
            }}
          />
          {/* Search bar */}
          <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--background)] border-b border-[var(--border)] p-4">
            <div className="relative max-w-2xl mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={handleInputChange}
                onFocus={() => setIsOpen(true)}
                placeholder="Search..."
                className="pl-10 pr-10 w-full rounded-[var(--radius-md)] border-[var(--border)] bg-[var(--background)]"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsMobileSearchOpen(false)
                  setQuery('')
                  setShowResults(false)
                }}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Search Results Dropdown - Desktop */}
      {isOpen && showResults && !isMobileSearchOpen && (
        <div className="hidden md:block absolute top-full left-0 right-0 mt-1 z-20">
          <Card className="max-h-[70vh] overflow-y-auto shadow-lg">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Searching...
                </div>
              ) : results.length > 0 ? (
                <div className="py-2">
                  {results.map((result, index) => (
                    <Link
                      key={`${result.type}-${result.id}-${index}`}
                      href={result.url}
                      onClick={handleResultClick}
                      className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-lg">{result.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {result.title}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
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
                <div className="p-4 text-center text-muted-foreground">
                  No results found for "{query}"
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Results Dropdown - Mobile */}
      {isMobileSearchOpen && isOpen && showResults && (
        <div className="md:hidden fixed top-[73px] left-0 right-0 z-50 max-h-[calc(100vh-73px)] overflow-y-auto bg-[var(--background)] border-b border-[var(--border)]">
          <div className="max-w-2xl mx-auto">
            {isLoading ? (
              <div className="p-4 text-center text-muted-foreground">
                Searching...
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
                    className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors border-b border-[var(--border)] last:border-b-0"
                  >
                    <span className="text-lg">{result.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {result.title}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
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
              <div className="p-4 text-center text-muted-foreground">
                No results found for "{query}"
              </div>
            ) : null}
          </div>
        </div>
      )}

    </div>
  )
}
