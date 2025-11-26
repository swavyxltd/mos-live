import { CardSkeleton, Skeleton } from '@/components/loading/skeleton'

export default function Loading() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      <CardSkeleton />
    </div>
  )
}

