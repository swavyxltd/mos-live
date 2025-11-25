import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Home, Search } from 'lucide-react'
import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 text-center">
        <div className="mb-4 flex justify-center">
          <Search className="h-16 w-16 text-[var(--muted-foreground)]" />
        </div>
        <h1 className="mb-2 text-4xl font-bold text-[var(--foreground)]">
          404
        </h1>
        <h2 className="mb-2 text-2xl font-semibold text-[var(--foreground)]">
          Page Not Found
        </h2>
        <p className="mb-6 text-[var(--muted-foreground)]">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button asChild variant="default" className="w-full sm:w-auto">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href="/dashboard">
              Go to dashboard
            </Link>
          </Button>
        </div>
      </Card>
    </div>
  )
}

