import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Home, Search } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function NotFound() {
  return (
    <div className="min-h-screen relative flex items-center justify-center p-4" data-theme="light">
      {/* Background image - clean, no overlays */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/auth-bg.png)'
        }}
      />
      
      {/* Content - centered with grid */}
      <div className="relative z-10 w-full grid place-items-center">
        <div className="flex w-full max-w-sm flex-col gap-6">
          {/* Logo/Branding */}
          <a href="/" className="flex items-center gap-2 self-center">
            <Image 
              src="/logo.png" 
              alt="Madrasah OS" 
              width={128}
              height={32}
              className="h-8 w-auto"
              priority
              fetchPriority="high"
            />
          </a>

          {/* Card */}
          <Card>
            <CardHeader className="text-center">
              <div className="mb-4 flex justify-center">
                <Search className="h-12 w-12 text-[var(--muted-foreground)]" />
              </div>
              <CardTitle className="text-4xl">404</CardTitle>
              <CardDescription className="text-base">
                Page Not Found
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-6 text-center text-sm text-[var(--muted-foreground)]">
                Oops! Looks like this page took a wrong turn. Let's get you back on track.
              </p>
              <Link href="/dashboard" className="w-full">
                <Button variant="default" className="w-full">
                  <Home className="mr-2 h-4 w-4" />
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

