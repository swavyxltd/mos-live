import { CardSkeleton } from '@/components/loading/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 bg-[var(--muted)] rounded-[var(--radius)] animate-pulse mb-6" />
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  )
}

