'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Filter, Search, X, Calendar, Users, Heart, AlertTriangle, ChevronDown } from 'lucide-react'

interface Class {
  id: string
  name: string
  grade: string
}

interface StudentsFiltersProps {
  classes: Class[]
  onFiltersChange?: (filters: FilterState) => void
}

interface FilterState {
  search: string
  selectedClass: string
  ageRange: string
  enrollmentDateRange: string
  allergies: string
  attendanceRange: string
  status: string
}

export function StudentsFilters({ classes, onFiltersChange }: StudentsFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    selectedClass: '',
    ageRange: '',
    enrollmentDateRange: '',
    allergies: '',
    attendanceRange: '',
    status: '',
  })

  const [showFilters, setShowFilters] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        // No need to update showClassFilter and showAgeFilter since they're removed
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    // Convert "all" to empty string for filtering logic
    const filterValue = value === 'all' ? '' : value
    const newFilters = { ...filters, [key]: filterValue }
    setFilters(newFilters)
    if (onFiltersChange) {
      onFiltersChange(newFilters)
    }
  }

  const clearFilters = () => {
    const clearedFilters = {
      search: '',
      selectedClass: '',
      ageRange: '',
      enrollmentDateRange: '',
      allergies: '',
      attendanceRange: '',
      status: '',
    }
    setFilters(clearedFilters)
    if (onFiltersChange) {
      onFiltersChange(clearedFilters)
    }
  }

  const activeFiltersCount = Object.values(filters).filter(value => value !== '').length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters & Search
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount}</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
            </Button>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="h-4 w-4 mr-2" />
                Clear All
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search students by name, email, parent name..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>

        {showFilters && (
          <div className="space-y-4" ref={filterRef}>
            {/* Filter Categories Row */}
            <div className="flex flex-wrap gap-3">
              {/* Active Students Filter */}
              <Button
                variant={filters.status === 'ACTIVE' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('status', filters.status === 'ACTIVE' ? '' : 'ACTIVE')}
                className="flex items-center gap-2"
              >
                Active Students
              </Button>

              {/* With Allergies Filter */}
              <Button
                variant={filters.allergies === 'has-allergies' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('allergies', filters.allergies === 'has-allergies' ? '' : 'has-allergies')}
                className="flex items-center gap-2"
              >
                <Heart className="h-4 w-4" />
                With Allergies
              </Button>

              {/* Low Attendance Filter */}
              <Button
                variant={filters.attendanceRange === 'poor' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('attendanceRange', filters.attendanceRange === 'poor' ? '' : 'poor')}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                Low Attendance
              </Button>

              {/* New This Month Filter */}
              <Button
                variant={filters.enrollmentDateRange === 'last-month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('enrollmentDateRange', filters.enrollmentDateRange === 'last-month' ? '' : 'last-month')}
                className="flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                New This Month
              </Button>

                      {/* Class Filter - Temporarily disabled */}
                      <div className="relative">
                        <select
                          value={filters.selectedClass || 'all'}
                          onChange={(e) => handleFilterChange('selectedClass', e.target.value)}
                          className="w-48 px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="all">All Classes</option>
                          {classes.map((cls) => (
                            <option key={cls.id} value={cls.id}>
                              {cls.name} ({cls.grade})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Age Range Filter - Temporarily disabled */}
                      <div className="relative">
                        <select
                          value={filters.ageRange || 'all'}
                          onChange={(e) => handleFilterChange('ageRange', e.target.value)}
                          className="w-48 px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="all">All Ages</option>
                          <option value="5-7">5-7 years</option>
                          <option value="8-10">8-10 years</option>
                          <option value="11-13">11-13 years</option>
                          <option value="14+">14+ years</option>
                        </select>
                      </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-500">Active filters:</span>
            {filters.search && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Search: {filters.search}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('search', '')}
                />
              </Badge>
            )}
            {filters.selectedClass && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Class: {classes.find(c => c.id === filters.selectedClass)?.name}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('selectedClass', '')}
                />
              </Badge>
            )}
            {filters.ageRange && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Age: {filters.ageRange}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('ageRange', '')}
                />
              </Badge>
            )}
            {filters.allergies && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Allergies: {filters.allergies}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('allergies', '')}
                />
              </Badge>
            )}
            {filters.attendanceRange && (
              <Badge variant="secondary" className="flex items-center gap-1">
                Attendance: {filters.attendanceRange}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('attendanceRange', '')}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
