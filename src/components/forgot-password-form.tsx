'use client'

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ForgotPasswordFormProps extends React.ComponentProps<"div"> {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>
  isLoading?: boolean
  error?: string
  success?: boolean
  onBackToSignIn?: () => void
}

export function ForgotPasswordForm({
  className,
  onSubmit,
  isLoading = false,
  error,
  success = false,
  onBackToSignIn,
  ...props
}: ForgotPasswordFormProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Reset your password</CardTitle>
          <CardDescription>
            Enter your email address and we&apos;ll send you a link to reset your password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!success ? (
            <form onSubmit={onSubmit}>
              <div className="flex flex-col gap-6">
                {/* Error message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Email field */}
                <div className="flex flex-col gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="m@example.com"
                    required
                    autoComplete="email"
                  />
                </div>

                {/* Submit button */}
                <div className="flex flex-col gap-2">
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-6">
              {/* Success message */}
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm text-center">
                Password reset email sent! Please check your inbox.
              </div>

              {/* Back to sign in button */}
              {onBackToSignIn && (
                <Button onClick={onBackToSignIn} className="w-full">
                  Back to Sign In
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Back to sign in link */}
      {!success && (
        <p className="px-6 text-center text-sm text-gray-600">
          <a href="/auth/signin" className="underline-offset-4 hover:underline">
            ← Back to sign in
          </a>
        </p>
      )}
    </div>
  )
}

