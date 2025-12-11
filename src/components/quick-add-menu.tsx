'use client'

import * as React from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Plus, UserPlus, GraduationCap, BookOpen } from 'lucide-react'

interface QuickAddMenuProps {
  onAddStudent?: () => void
  onAddTeacher?: () => void
  onAddClass?: () => void
}

export function QuickAddMenu({ onAddStudent, onAddTeacher, onAddClass }: QuickAddMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hover:bg-gray-50">
          <Plus className="h-4 w-4 mr-2" />
          Quick Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] sm:w-56 bg-white border border-gray-200 shadow-lg rounded-md">
        <DropdownMenuItem onClick={onAddStudent}>
          <UserPlus className="mr-2 h-4 w-4" />
          <span>Add Student</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddTeacher}>
          <GraduationCap className="mr-2 h-4 w-4" />
          <span>Add Staff</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onAddClass}>
          <BookOpen className="mr-2 h-4 w-4" />
          <span>Add Class</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
