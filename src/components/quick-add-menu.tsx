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
import Link from 'next/link'

export function QuickAddMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hover:bg-gray-50 hover:scale-105 transition-all duration-200">
          <Plus className="h-4 w-4 mr-2" />
          Quick Add
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56 bg-white border border-gray-200 shadow-lg rounded-md">
        <DropdownMenuItem asChild>
          <Link href="/students?action=add">
            <UserPlus className="mr-2 h-4 w-4" />
            <span>Add Student</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings?action=add-teacher">
            <GraduationCap className="mr-2 h-4 w-4" />
            <span>Add Teacher</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/classes?action=add">
            <BookOpen className="mr-2 h-4 w-4" />
            <span>Add Class</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
