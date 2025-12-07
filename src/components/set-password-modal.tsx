'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Eye, EyeOff, Key, Check, X } from 'lucide-react'

interface SetPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  onSetPassword: (newPassword: string) => Promise<void>
  staffName: string
  isLoading?: boolean
}

export function SetPasswordModal({
  isOpen,
  onClose,
  onSetPassword,
  staffName,
  isLoading = false
}: SetPasswordModalProps) {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})
  const [passwordRequirements, setPasswordRequirements] = useState<Array<{ text: string; required: boolean; met: (password: string) => boolean }>>([])

  // Fetch password requirements on mount
  useEffect(() => {
    fetch('/api/settings/password-requirements')
      .then(res => res.json())
      .then(data => {
        if (data.requirements) {
          // Convert requirements to format with met function
          const reqs = data.requirements.map((req: { text: string; required: boolean }) => {
            let met: (password: string) => boolean
            
            if (req.text.includes('characters')) {
              const minLength = parseInt(req.text.match(/\d+/)?.[0] || '8')
              met = (p: string) => p.length >= minLength
            } else if (req.text.includes('uppercase')) {
              met = (p: string) => /[A-Z]/.test(p)
            } else if (req.text.includes('lowercase')) {
              met = (p: string) => /[a-z]/.test(p)
            } else if (req.text.includes('number')) {
              met = (p: string) => /\d/.test(p)
            } else if (req.text.includes('special')) {
              met = (p: string) => /[^A-Za-z0-9]/.test(p)
            } else {
              met = () => false
            }
            
            return { ...req, met }
          })
          setPasswordRequirements(reqs)
        }
      })
      .catch(() => {
        // Fallback to default requirements if fetch fails
        setPasswordRequirements([
          { text: 'At least 8 characters', required: true, met: (p: string) => p.length >= 8 },
          { text: 'One uppercase letter', required: true, met: (p: string) => /[A-Z]/.test(p) },
          { text: 'One lowercase letter', required: true, met: (p: string) => /[a-z]/.test(p) },
          { text: 'One number', required: true, met: (p: string) => /\d/.test(p) }
        ])
      })
  }, [])

  const validatePassword = (password: string) => {
    const errors: string[] = []
    passwordRequirements.forEach(req => {
      if (req.required && !req.met(password)) {
        errors.push(req.text)
      }
    })
    return errors
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const passwordErrors = validatePassword(newPassword)
    const newErrors: { [key: string]: string } = {}

    if (passwordErrors.length > 0) {
      newErrors.password = passwordErrors.join(', ')
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await onSetPassword(newPassword)
      handleClose()
    } catch (error) {
    }
  }

  const handleClose = () => {
    setNewPassword('')
    setConfirmPassword('')
    setShowPassword(false)
    setShowConfirmPassword(false)
    setErrors({})
    onClose()
  }

  // Use dynamic requirements with current password state
  const currentRequirements = passwordRequirements.map(req => ({
    text: req.text,
    met: req.met(newPassword)
  }))

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Set New Password">
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Set New Password for {staffName}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* New Password */}
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password *</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className={errors.password ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    className={errors.confirmPassword ? 'border-red-500' : ''}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Password Requirements */}
              {passwordRequirements.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Password Requirements:</Label>
                  <div className="space-y-1">
                    {currentRequirements.map((req, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      {req.met ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <X className="h-4 w-4 text-gray-400" />
                      )}
                      <span className={req.met ? 'text-green-600' : 'text-gray-600'}>
                        {req.text}
                      </span>
                    </div>
                  ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading || !newPassword || !confirmPassword}
                >
                  {isLoading ? 'Setting Password...' : 'Set Password'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </Modal>
  )
}
