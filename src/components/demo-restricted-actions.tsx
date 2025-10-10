'use client'

import { Button } from '@/components/ui/button'
import { RestrictedAction } from '@/components/restricted-action'
import { Plus, Users, GraduationCap, Calendar, BarChart3 } from 'lucide-react'

export function DemoRestrictedActions() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Demo: Restricted Actions</h2>
      <p className="text-gray-600">
        Try clicking these buttons. If payment is not set up, you'll see a modal.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <RestrictedAction action="add-student">
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Student
          </Button>
        </RestrictedAction>
        
        <RestrictedAction action="add-teacher">
          <Button className="w-full">
            <Users className="h-4 w-4 mr-2" />
            Add Teacher
          </Button>
        </RestrictedAction>
        
        <RestrictedAction action="create-class">
          <Button className="w-full">
            <GraduationCap className="h-4 w-4 mr-2" />
            Create Class
          </Button>
        </RestrictedAction>
        
        <RestrictedAction action="attendance">
          <Button className="w-full">
            <Calendar className="h-4 w-4 mr-2" />
            Track Attendance
          </Button>
        </RestrictedAction>
        
        <RestrictedAction action="reports">
          <Button className="w-full">
            <BarChart3 className="h-4 w-4 mr-2" />
            Generate Reports
          </Button>
        </RestrictedAction>
      </div>
    </div>
  )
}
