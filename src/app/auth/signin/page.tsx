'use client'

import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function SignInPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard'
  const portal = searchParams.get('portal') || 'app'

  useEffect(() => {
    // Check if already signed in
    getSession().then((session) => {
      if (session) {
        if (portal === 'parent') {
            window.location.href = '/parent/dashboard'
        } else {
          window.location.href = callbackUrl
        }
      }
    })
  }, [callbackUrl, portal])

  const handleGoogleSignIn = async () => {
    setIsLoading(true)
    setError('')
    
    try {
      const result = await signIn('google', {
        redirect: false,
        callbackUrl: portal === 'parent' ? '/parent/dashboard' : callbackUrl
      })
      
      if (result?.error) {
        setError('Failed to sign in with Google')
      } else if (result?.ok) {
        if (portal === 'parent') {
            window.location.href = '/parent/dashboard'
        } else {
          window.location.href = callbackUrl
        }
      }
    } catch (error) {
      setError('An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCredentialsSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    
    const formData = new FormData(e.currentTarget)
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
        callbackUrl: portal === 'parent' ? '/parent/dashboard' : callbackUrl
      })
      
      if (result?.error) {
        setError('Invalid email or password')
      } else if (result?.ok) {
        // Get session to check user role
        const session = await getSession()
        if (session?.user) {
          if (session.user.isSuperAdmin) {
            window.location.href = '/owner/overview'
          } else if (portal === 'parent') {
            window.location.href = '/parent/dashboard'
          } else {
            window.location.href = callbackUrl
          }
        } else {
          window.location.href = callbackUrl
        }
      }
    } catch (error) {
      setError('An error occurred during sign in')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Madrasah OS</h1>
          <p className="mt-2 text-sm text-gray-600">
            {portal === 'parent' ? 'Parent Portal' : 'Staff Portal'}
          </p>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Sign in to your account</CardTitle>
            <CardDescription>
              Choose your preferred sign in method
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}
            
            <Button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full"
              variant="outline"
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continue with Google
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">Or continue with email</span>
              </div>
            </div>
            
            <form onSubmit={handleCredentialsSignIn} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your email"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Enter your password"
                />
              </div>
              
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            
            <div className="text-center text-sm text-gray-600">
              <p>Demo credentials:</p>
              <p>owner@demo.com / admin@demo.com / teacher@demo.com / parent@demo.com</p>
              <p>Password: demo123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
