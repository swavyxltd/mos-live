'use client'

import * as React from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { StaffSubrole, StaffPermissionKey, PERMISSION_DEFINITIONS, getStaffPermissionKeys } from '@/types/staff-roles'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { UserCheck, User, Shield, Lock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PermissionSelectorProps {
  staffSubrole: StaffSubrole
  selectedPermissions: StaffPermissionKey[]
  onSubroleChange: (subrole: StaffSubrole) => void
  onPermissionsChange: (permissions: StaffPermissionKey[]) => void
  isEditing?: boolean
}

export function PermissionSelector({
  staffSubrole,
  selectedPermissions,
  onSubroleChange,
  onPermissionsChange,
  isEditing = false,
}: PermissionSelectorProps) {
  const allPermissionKeys = Object.keys(PERMISSION_DEFINITIONS) as StaffPermissionKey[]
  
  // Get base permissions for the selected role
  const basePermissions = React.useMemo(() => {
    return getStaffPermissionKeys(staffSubrole)
  }, [staffSubrole])
  
  // Get additional permissions (selected but not in base)
  const additionalPermissions = React.useMemo(() => {
    return selectedPermissions.filter(p => !basePermissions.includes(p))
  }, [selectedPermissions, basePermissions])

  // When subrole changes, reset to base permissions (but preserve additional permissions)
  const prevSubroleRef = React.useRef<StaffSubrole>(staffSubrole)
  const isUpdatingRef = React.useRef(false)
  
  React.useEffect(() => {
    // Only run if subrole actually changed (not on initial mount or permission updates)
    if (prevSubroleRef.current === staffSubrole || isUpdatingRef.current) {
      return
    }
    
    isUpdatingRef.current = true
    
    const oldBasePermissions = getStaffPermissionKeys(prevSubroleRef.current)
    const newBasePermissions = getStaffPermissionKeys(staffSubrole)
    
    // Get current additional permissions (selected but not in old base)
    const currentAdditional = selectedPermissions.filter(p => !oldBasePermissions.includes(p))
    
    // Ensure all new base permissions are included, plus any additional ones
    const finalPermissions = [...new Set([...newBasePermissions, ...currentAdditional])]
    
    // Update permissions
    onPermissionsChange(finalPermissions)
    
    // Update refs
    prevSubroleRef.current = staffSubrole
    setTimeout(() => {
      isUpdatingRef.current = false
    }, 0)
  }, [staffSubrole]) // Only depend on staffSubrole

  const handleSubroleSelect = (value: string) => {
    const newSubrole = value as StaffSubrole
    onSubroleChange(newSubrole)
    // Permissions will be updated by useEffect
  }

  const handlePermissionToggle = (permissionKey: StaffPermissionKey) => {
    const isBasePermission = basePermissions.includes(permissionKey)
    
    // Can't remove base permissions
    if (isBasePermission && selectedPermissions.includes(permissionKey)) {
      return
    }
    
    // Toggle additional permissions
    if (selectedPermissions.includes(permissionKey)) {
      // Remove from additional
      onPermissionsChange(selectedPermissions.filter(p => p !== permissionKey))
    } else {
      // Add to additional
      onPermissionsChange([...selectedPermissions, permissionKey])
    }
  }

  const handleSelectAllAdditional = () => {
    // Add all non-base permissions
    const allAdditional = allPermissionKeys.filter(p => !basePermissions.includes(p))
    onPermissionsChange([...basePermissions, ...allAdditional])
  }

  const handleDeselectAllAdditional = () => {
    // Keep only base permissions
    onPermissionsChange([...basePermissions])
  }

  const additionalCount = additionalPermissions.length
  const availableAdditionalCount = allPermissionKeys.filter(p => !basePermissions.includes(p)).length

  return (
    <div className="space-y-4">
      {/* Role Template */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-[var(--foreground)]">
          Role
        </Label>
        <Select value={staffSubrole} onValueChange={handleSubroleSelect}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ADMIN">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4" />
                <span>Admin - Full access</span>
              </div>
            </SelectItem>
            <SelectItem value="TEACHER">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Teacher - Teaching access</span>
              </div>
            </SelectItem>
            <SelectItem value="FINANCE_OFFICER">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                <span>Finance Officer - Financial access</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        <div className="bg-[var(--accent)]/20 border border-[var(--border)] rounded-lg p-3 mt-2">
          <p className="text-sm text-[var(--foreground)] font-medium mb-1">Dashboard Type:</p>
          <p className="text-sm text-[var(--muted-foreground)]">
            {staffSubrole === 'ADMIN'
              ? 'Full dashboard with all organization stats'
              : staffSubrole === 'TEACHER'
              ? 'Teacher dashboard showing only their assigned classes'
              : staffSubrole === 'FINANCE_OFFICER'
              ? 'Finance dashboard with financial overview'
              : 'Full dashboard with all organization stats'}
          </p>
        </div>
      </div>

      {/* Base Permissions */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium text-[var(--foreground)] flex items-center gap-1.5">
            Base Permissions
            <Lock className="h-4 w-4 text-[var(--muted-foreground)]" />
          </Label>
          <span className="text-sm text-[var(--muted-foreground)]">
            {basePermissions.length} included
          </span>
        </div>
        
        <div className="border border-[var(--border)] rounded-lg bg-[var(--card)] p-2">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {basePermissions.map((permissionKey) => {
              const definition = PERMISSION_DEFINITIONS[permissionKey]

              return (
                <div
                  key={permissionKey}
                  className={cn(
                    "flex items-center gap-1.5 px-2 py-1.5 rounded border border-[var(--border)]",
                    "bg-[var(--accent)]/20"
                  )}
                >
                  <Lock className="h-4 w-4 text-[var(--muted-foreground)] flex-shrink-0" />
                  <span className="text-sm font-medium text-[var(--foreground)] truncate">
                    {definition.name}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <p className="text-sm text-[var(--muted-foreground)]">
          Automatically included with {staffSubrole.toLowerCase().replace(/_/g, ' ')} role
        </p>
      </div>

      {/* Additional Permissions */}
      {availableAdditionalCount > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-[var(--foreground)]">
              Additional Permissions
            </Label>
            <div className="flex gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleSelectAllAdditional}
                className="h-7 text-sm px-2"
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleDeselectAllAdditional}
                className="h-7 text-sm px-2"
              >
                Clear All
              </Button>
            </div>
          </div>
          
          <div className="border border-[var(--border)] rounded-lg bg-[var(--card)] p-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {allPermissionKeys
                .filter(p => !basePermissions.includes(p))
                .map((permissionKey) => {
                  const definition = PERMISSION_DEFINITIONS[permissionKey]
                  const isChecked = selectedPermissions.includes(permissionKey)

                  return (
                    <label
                      key={permissionKey}
                      htmlFor={permissionKey}
                      className={cn(
                        "flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors border border-transparent",
                        "hover:bg-[var(--accent)]/50 hover:border-[var(--border)]",
                        isChecked && "bg-[var(--accent)]/30 border-[var(--border)]"
                      )}
                    >
                      <Checkbox
                        id={permissionKey}
                        checked={isChecked}
                        onCheckedChange={() => handlePermissionToggle(permissionKey)}
                        className="h-3.5 w-3.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-[var(--foreground)]">
                          {definition.name}
                        </div>
                      </div>
                    </label>
                  )
                })}
            </div>
          </div>

          <p className="text-sm text-[var(--muted-foreground)]">
            {additionalCount} of {availableAdditionalCount} selected
          </p>
        </div>
      )}
    </div>
  )
}
